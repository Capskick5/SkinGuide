// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.security;

import mss.userservice.config.JwtProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stores opaque refresh tokens in Redis with a TTL.
 *   refresh:{token}      -> userId          (the token itself)
 *   refresh:user:{id}    -> Set<token>      (index for bulk revocation)
 * Enables single logout, "logout everywhere", and natural expiry.
 */
@Component
public class RefreshTokenStore {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenStore.class);
    private static final String TOKEN_PREFIX = "refresh:";
    private static final String USER_PREFIX = "refresh:user:";

    private final StringRedisTemplate redis;
    private final Duration ttl;
    private final Map<String, InMemoryToken> fallbackTokens = new ConcurrentHashMap<>();

    public RefreshTokenStore(StringRedisTemplate redis, JwtProperties properties) {
        this.redis = redis;
        this.ttl = Duration.ofSeconds(properties.refreshTokenTtlSeconds());
    }

    /** Create and persist a new refresh token for a user. */
    public String issue(String userId) {
        String token = UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        try {
            redis.opsForValue().set(TOKEN_PREFIX + token, userId, ttl);
            redis.opsForSet().add(USER_PREFIX + userId, token);
            redis.expire(USER_PREFIX + userId, ttl);
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while issuing refresh token; using in-memory fallback for this runtime");
            fallbackTokens.put(token, new InMemoryToken(userId, Instant.now().plus(ttl)));
        }
        return token;
    }

    /** Returns the userId bound to a token, or null if missing/expired. */
    public String resolveUserId(String token) {
        try {
            String userId = redis.opsForValue().get(TOKEN_PREFIX + token);
            if (userId != null) {
                return userId;
            }
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while resolving refresh token; checking in-memory fallback");
        }
        return resolveFallbackUserId(token);
    }

    /** Invalidate a single refresh token (logout). */
    public void revoke(String token) {
        try {
            String userId = redis.opsForValue().get(TOKEN_PREFIX + token);
            redis.delete(TOKEN_PREFIX + token);
            if (userId != null) {
                redis.opsForSet().remove(USER_PREFIX + userId, token);
            }
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while revoking refresh token; clearing in-memory fallback only");
        }
        fallbackTokens.remove(token);
    }

    /** Rotate: revoke the old token and issue a new one for the same user. */
    public String rotate(String oldToken, String userId) {
        // Áp dụng "Grace Period" 60 giây thay vì xóa ngay lập tức
        // Điều này giúp tránh lỗi race condition khi người dùng mở nhiều tab
        try {
            redis.expire(TOKEN_PREFIX + oldToken, Duration.ofSeconds(60));
        } catch (DataAccessException ex) {
            InMemoryToken stored = fallbackTokens.get(oldToken);
            if (stored != null) {
                fallbackTokens.put(oldToken, new InMemoryToken(userId, Instant.now().plusSeconds(60)));
            }
        }
        return issue(userId);
    }

    /** Invalidate every refresh token for a user (e.g. after password reset). */
    public void revokeAllForUser(String userId) {
        try {
            Set<String> tokens = redis.opsForSet().members(USER_PREFIX + userId);
            if (tokens != null) {
                for (String token : tokens) {
                    redis.delete(TOKEN_PREFIX + token);
                }
            }
            redis.delete(USER_PREFIX + userId);
        } catch (DataAccessException ex) {
            log.warn("Redis unavailable while revoking all refresh tokens; clearing matching in-memory fallback only");
        }
        fallbackTokens.entrySet().removeIf(entry -> entry.getValue().userId().equals(userId));
    }

    public long getTtlSeconds() {
        return ttl.getSeconds();
    }

    private String resolveFallbackUserId(String token) {
        InMemoryToken stored = fallbackTokens.get(token);
        if (stored == null) {
            return null;
        }
        if (stored.expiresAt().isBefore(Instant.now())) {
            fallbackTokens.remove(token);
            return null;
        }
        return stored.userId();
    }

    private record InMemoryToken(String userId, Instant expiresAt) {
    }
}
