package mss.userservice.service;

import mss.userservice.config.GoogleOAuthProperties;
import mss.userservice.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestOperations;

import java.net.URI;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GoogleTokenVerifierTest {

    private RestOperations restOperations;
    private GoogleTokenVerifier verifier;

    @BeforeEach
    void setUp() {
        restOperations = mock(RestOperations.class);
        verifier = new GoogleTokenVerifier(new GoogleOAuthProperties("skin-guide-client"), restOperations);
    }

    @Test
    void acceptsVerifiedIdentityForConfiguredAudience() {
        when(restOperations.getForObject(any(URI.class), eq(Map.class))).thenReturn(Map.of(
                "aud", "skin-guide-client",
                "iss", "https://accounts.google.com",
                "email_verified", "true",
                "email", "user@example.com",
                "name", "Skin Guide User"
        ));

        GoogleTokenVerifier.GoogleIdentity identity = verifier.verify("credential");

        assertThat(identity.email()).isEqualTo("user@example.com");
        assertThat(identity.name()).isEqualTo("Skin Guide User");
    }

    @Test
    void rejectsTokenIssuedForAnotherApplication() {
        when(restOperations.getForObject(any(URI.class), eq(Map.class))).thenReturn(Map.of(
                "aud", "another-client",
                "iss", "accounts.google.com",
                "email_verified", "true",
                "email", "user@example.com"
        ));

        assertUnauthorized(() -> verifier.verify("credential"));
    }

    @Test
    void rejectsUnverifiedGoogleEmail() {
        when(restOperations.getForObject(any(URI.class), eq(Map.class))).thenReturn(Map.of(
                "aud", "skin-guide-client",
                "iss", "accounts.google.com",
                "email_verified", "false",
                "email", "user@example.com"
        ));

        assertUnauthorized(() -> verifier.verify("credential"));
    }

    private void assertUnauthorized(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
