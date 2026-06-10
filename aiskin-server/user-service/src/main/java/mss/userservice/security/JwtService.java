package mss.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import mss.userservice.config.JwtProperties;
import mss.userservice.model.Role;
import mss.userservice.model.User;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Issues and validates JWT access tokens (jjwt 0.12.x API).
 * Refresh tokens are opaque and tracked in Redis (see RefreshTokenStore).
 */
@Service
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        // secret is a Base64-encoded 256-bit (or longer) key
        this.signingKey = Keys.hmacShaKeyFor(java.util.Base64.getDecoder().decode(properties.secret()));
    }

    /** Build a signed access token carrying the user's id, email and roles. */
    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.accessTokenTtlSeconds());
        List<String> roles = user.getRoles().stream().map(Role::name).collect(Collectors.toList());
        return Jwts.builder()
                .subject(user.getId())
                .issuer(properties.issuer())
                .claim("email", user.getEmail())
                .claim("roles", roles)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    /** Parse and validate a token, returning its claims. Throws JwtException if invalid/expired. */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(properties.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUserId(String token) {
        return parse(token).getSubject();
    }

    @SuppressWarnings("unchecked")
    public Set<String> extractRoles(Claims claims) {
        Object raw = claims.get("roles");
        if (raw instanceof List<?> list) {
            return list.stream().map(Object::toString).collect(Collectors.toSet());
        }
        return Set.of();
    }

    public long getAccessTokenTtlSeconds() {
        return properties.accessTokenTtlSeconds();
    }
}
