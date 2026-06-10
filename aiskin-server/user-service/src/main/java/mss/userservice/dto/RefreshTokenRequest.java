package mss.userservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload for POST /api/auth/refresh.
 */
public record RefreshTokenRequest(

        @NotBlank(message = "Refresh token là bắt buộc")
        String refreshToken
) {
}
