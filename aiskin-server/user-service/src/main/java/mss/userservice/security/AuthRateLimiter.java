package mss.userservice.security;

import mss.userservice.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(AuthRateLimiter.class);
    private static final String KEY_PREFIX = "auth:limit:";
    private final StringRedisTemplate redis;
    private final Map<String, WindowCounter> fallbackCounters = new ConcurrentHashMap<>();

    public AuthRateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void assertAllowed(String action, String identity, int maxAttempts, Duration window) {
        if (currentCount(key(action, identity)) >= maxAttempts) {
            throw rateLimitExceeded(window);
        }
    }

    public void recordFailure(String action, String identity, Duration window) {
        increment(key(action, identity), window);
    }

    public void consume(String action, String identity, int maxAttempts, Duration window) {
        if (increment(key(action, identity), window) > maxAttempts) {
            throw rateLimitExceeded(window);
        }
    }

    public void clear(String action, String identity) {
        String key = key(action, identity);
        if (redis != null) {
            try {
                redis.delete(key);
            } catch (DataAccessException exception) {
                log.warn("Redis unavailable while clearing auth rate limit; clearing fallback only");
            }
        }
        fallbackCounters.remove(key);
    }

    private long currentCount(String key) {
        if (redis != null) {
            try {
                String value = redis.opsForValue().get(key);
                return value == null ? 0 : Long.parseLong(value);
            } catch (DataAccessException | NumberFormatException exception) {
                log.warn("Redis unavailable while reading auth rate limit; using in-memory fallback");
            }
        }

        WindowCounter counter = fallbackCounters.get(key);
        if (counter == null) return 0;
        if (counter.expiresAt().isBefore(Instant.now())) {
            fallbackCounters.remove(key, counter);
            return 0;
        }
        return counter.count();
    }

    private long increment(String key, Duration window) {
        if (redis != null) {
            try {
                Long count = redis.opsForValue().increment(key);
                if (count != null && count == 1) redis.expire(key, window);
                if (count != null) return count;
            } catch (DataAccessException exception) {
                log.warn("Redis unavailable while updating auth rate limit; using in-memory fallback");
            }
        }

        Instant now = Instant.now();
        return fallbackCounters.compute(key, (ignored, current) -> {
            if (current == null || current.expiresAt().isBefore(now)) {
                return new WindowCounter(1, now.plus(window));
            }
            return new WindowCounter(current.count() + 1, current.expiresAt());
        }).count();
    }

    private String key(String action, String identity) {
        String normalizedIdentity = identity == null ? "anonymous" : identity.trim().toLowerCase();
        return KEY_PREFIX + action + ":" + sha256(normalizedIdentity);
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private ApiException rateLimitExceeded(Duration window) {
        return ApiException.tooManyRequests(
                "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau " + window.toMinutes() + " phút");
    }

    private record WindowCounter(long count, Instant expiresAt) {
    }
}
