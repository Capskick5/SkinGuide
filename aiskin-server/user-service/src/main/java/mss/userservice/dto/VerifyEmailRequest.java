package mss.userservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload for POST /api/auth/verify-email.
 */
public record VerifyEmailRequest(

        @Schema(example = "user@example.com")
        @NotBlank(message = "Email là bắt buộc")
        @Email(message = "Email không hợp lệ")
        String email,

        @Schema(example = "123456")
        @NotBlank(message = "Mã OTP là bắt buộc")
        String otp
) {
}
