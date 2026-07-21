// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the app.jwt.* settings from application.yml.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long accessTokenTtlSeconds,
        long refreshTokenTtlSeconds,
        String issuer
) {
}
