package mss.userservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload for POST /api/auth/reset-password.
 * Uses the OTP delivered via the forgot-password flow.
 */
public record ResetPasswordRequest(

        @Schema(example = "user@example.com")
        @NotBlank(message = "Email là bắt buộc")
        @Email(message = "Email không hợp lệ")
        String email,

        @Schema(example = "123456")
        @NotBlank(message = "Mã OTP là bắt buộc")
        String otp,

        @Schema(example = "N3wP@ssw0rd")
        @NotBlank(message = "Mật khẩu mới là bắt buộc")
        @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
        String newPassword
) {
}
