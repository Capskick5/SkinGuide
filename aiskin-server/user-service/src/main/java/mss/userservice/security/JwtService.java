package mss.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import mss.userservice.config.JwtProperties;
import mss.userservice.model.User;
import mss.userservice.repository.RoleRepository;
import mss.userservice.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Issues and validates JWT access tokens (jjwt 0.12.x API).
 * Refresh tokens are opaque and tracked in Redis (see RefreshTokenStore).
 */
@Service
public class JwtService implements IJwtService {

    private final JwtProperties properties;

    private final SecretKey signingKey;

    private final RoleRepository roleRepository;

    private final PermissionRepository permissionRepository;

    public JwtService(JwtProperties properties, RoleRepository roleRepository, PermissionRepository permissionRepository) {
        this.properties = properties;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        // secret is a Base64-encoded 256-bit (or longer) key
        this.signingKey = Keys.hmacShaKeyFor(java.util.Base64.getDecoder().decode(properties.secret()));
    }

    /**
     * Build a signed access token carrying the user's id, email, roles and permissions.
     */
    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.accessTokenTtlSeconds());
        List<String> roles = new ArrayList<>(user.getRoles());
        List<String> permissions = new ArrayList<>();
        for (String roleName : roles) {
            roleRepository.findByName(roleName).ifPresent(r -> {
                if (r.getPermissions() != null) {
                    for (String permId : r.getPermissions()) {
                        permissionRepository.findById(permId).ifPresent(p -> {
                            permissions.add(p.getMethod() + ":" + p.getResource());
                        });
                    }
                }
            });
        }
        return Jwts.builder().subject(user.getId()).issuer(properties.issuer()).claim("email", user.getEmail()).claim("roles", roles).claim("permissions", permissions).issuedAt(Date.from(now)).expiration(Date.from(expiry)).signWith(signingKey).compact();
    }

    /**
     * Parse and validate a token, returning its claims. Throws JwtException if invalid/expired.
     */
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(signingKey).requireIssuer(properties.issuer()).build().parseSignedClaims(token).getPayload();
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
