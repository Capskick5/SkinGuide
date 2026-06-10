package mss.userservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds app.otp.* settings. OTPs are stored in Redis with TTL.
 */
@ConfigurationProperties(prefix = "app.otp")
public record OtpProperties(
        long ttlSeconds,
        int length,
        /** Dev only: return the OTP in API responses so it can be tested without email. */
        boolean exposeInResponse
) {
}
