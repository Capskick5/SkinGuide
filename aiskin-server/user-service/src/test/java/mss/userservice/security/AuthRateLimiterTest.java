package mss.userservice.security;

import mss.userservice.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRateLimiterTest {

    private final AuthRateLimiter limiter = new AuthRateLimiter(null);
    private final Duration window = Duration.ofMinutes(15);

    @Test
    void blocksAfterConfiguredFailedAttemptCount() {
        for (int attempt = 0; attempt < 5; attempt++) {
            limiter.assertAllowed("login", "user@example.com", 5, window);
            limiter.recordFailure("login", "user@example.com", window);
        }

        assertTooManyRequests(() -> limiter.assertAllowed("login", "user@example.com", 5, window));
    }

    @Test
    void limitsOtpIssuanceAndKeepsOtherIdentitiesIndependent() {
        for (int request = 0; request < 3; request++) {
            limiter.consume("send-otp", "first@example.com", 3, window);
        }

        assertTooManyRequests(() -> limiter.consume("send-otp", "first@example.com", 3, window));
        assertThatCode(() -> limiter.consume("send-otp", "second@example.com", 3, window))
                .doesNotThrowAnyException();
    }

    @Test
    void clearingCounterAllowsAnotherAttempt() {
        limiter.recordFailure("login", "user@example.com", window);
        limiter.clear("login", "user@example.com");

        assertThatCode(() -> limiter.assertAllowed("login", "user@example.com", 1, window))
                .doesNotThrowAnyException();
    }

    private void assertTooManyRequests(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }
}
