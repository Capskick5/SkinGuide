package mss.userservice.security;

import mss.userservice.config.OtpProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Generates and verifies one-time passwords, stored in Redis with TTL.
 * Key: otp:{purpose}:{email} -> Value: the code.
 */
@Component
public class OtpStore {

    private static final Logger log = LoggerFactory.getLogger(OtpStore.class);
    private static final String KEY_PREFIX = "otp:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redis;
    private final OtpProperties properties;
    private final Map<String, InMemoryOtp> fallbackOtps = new ConcurrentHashMap<>();

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
        String key = key(purpose, email);
        try {
            redis.opsForValue().set(key, code, Duration.ofSeconds(properties.ttlSeconds()));
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while generating OTP; using in-memory fallback for this runtime");
            fallbackOtps.put(key, new InMemoryOtp(code, Instant.now().plusSeconds(properties.ttlSeconds())));
        }
        return code;
    }

    /** Verify a submitted code; deletes it on success (single use). */
    public boolean verify(Purpose purpose, String email, String code) {
        String k = key(purpose, email);
        String stored = null;
        try {
            stored = redis.opsForValue().get(k);
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while verifying OTP; checking in-memory fallback");
        }
        if (stored != null && stored.equals(code)) {
            try {
                redis.delete(k);
            } catch (DataAccessException ex) {
                log.warn("Redis unavailable while deleting OTP after verification");
            }
            return true;
        }
        InMemoryOtp fallback = fallbackOtps.get(k);
        if (fallback == null) {
            return false;
        }
        if (fallback.expiresAt().isBefore(Instant.now())) {
            fallbackOtps.remove(k);
            return false;
        }
        if (fallback.code().equals(code)) {
            fallbackOtps.remove(k);
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

    private record InMemoryOtp(String code, Instant expiresAt) {
    }
}
