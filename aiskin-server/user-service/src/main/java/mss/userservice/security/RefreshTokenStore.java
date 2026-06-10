package mss.userservice.security;

import mss.userservice.config.JwtProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

/**
 * Stores opaque refresh tokens in Redis with a TTL.
 *   refresh:{token}      -> userId          (the token itself)
 *   refresh:user:{id}    -> Set<token>      (index for bulk revocation)
 * Enables single logout, "logout everywhere", and natural expiry.
 */
@Component
public class RefreshTokenStore {

    private static final String TOKEN_PREFIX = "refresh:";
    private static final String USER_PREFIX = "refresh:user:";

    private final StringRedisTemplate redis;
    private final Duration ttl;

    public RefreshTokenStore(StringRedisTemplate redis, JwtProperties properties) {
        this.redis = redis;
        this.ttl = Duration.ofSeconds(properties.refreshTokenTtlSeconds());
    }

    /** Create and persist a new refresh token for a user. */
    public String issue(String userId) {
        String token = UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        redis.opsForValue().set(TOKEN_PREFIX + token, userId, ttl);
        redis.opsForSet().add(USER_PREFIX + userId, token);
        redis.expire(USER_PREFIX + userId, ttl);
        return token;
    }

    /** Returns the userId bound to a token, or null if missing/expired. */
    public String resolveUserId(String token) {
        return redis.opsForValue().get(TOKEN_PREFIX + token);
    }

    /** Invalidate a single refresh token (logout). */
    public void revoke(String token) {
        String userId = redis.opsForValue().get(TOKEN_PREFIX + token);
        redis.delete(TOKEN_PREFIX + token);
        if (userId != null) {
            redis.opsForSet().remove(USER_PREFIX + userId, token);
        }
    }

    /** Rotate: revoke the old token and issue a new one for the same user. */
    public String rotate(String oldToken, String userId) {
        revoke(oldToken);
        return issue(userId);
    }

    /** Invalidate every refresh token for a user (e.g. after password reset). */
    public void revokeAllForUser(String userId) {
        Set<String> tokens = redis.opsForSet().members(USER_PREFIX + userId);
        if (tokens != null) {
            for (String token : tokens) {
                redis.delete(TOKEN_PREFIX + token);
            }
        }
        redis.delete(USER_PREFIX + userId);
    }

    public long getTtlSeconds() {
        return ttl.getSeconds();
    }
}
