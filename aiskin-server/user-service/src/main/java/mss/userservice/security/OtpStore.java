package mss.userservice.security;

import mss.userservice.config.OtpProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;

/**
 * Generates and verifies one-time passwords, stored in Redis with TTL.
 * Key: otp:{purpose}:{email} -> Value: the code.
 */
@Component
public class OtpStore {

    private static final String KEY_PREFIX = "otp:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redis;
    private final OtpProperties properties;

    public OtpStore(StringRedisTemplate redis, OtpProperties properties) {
        this.redis = redis;
        this.properties = properties;
    }

    /** Purpose distinguishes OTP use cases so codes can't be cross-used. */
    public enum Purpose {
        EMAIL_VERIFICATION,
        PASSWORD_RESET
    }

    private String key(Purpose purpose, String email) {
        return KEY_PREFIX + purpose.name().toLowerCase() + ":" + email;
    }

    /** Generate, store and return a fresh numeric OTP. */
    public String generate(Purpose purpose, String email) {
        String code = randomDigits(properties.length());
        redis.opsForValue().set(key(purpose, email), code, Duration.ofSeconds(properties.ttlSeconds()));
        return code;
    }

    /** Verify a submitted code; deletes it on success (single use). */
    public boolean verify(Purpose purpose, String email, String code) {
        String k = key(purpose, email);
        String stored = redis.opsForValue().get(k);
        if (stored != null && stored.equals(code)) {
            redis.delete(k);
            return true;
        }
        return false;
    }

    private String randomDigits(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(RANDOM.nextInt(10));
        }
        return sb.toString();
    }
}
