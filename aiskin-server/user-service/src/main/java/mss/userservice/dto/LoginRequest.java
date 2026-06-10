package mss.userservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload for POST /api/auth/login.
 */
public record LoginRequest(

        @Schema(example = "user@example.com")
        @NotBlank(message = "Email là bắt buộc")
        @Email(message = "Email không hợp lệ")
        String email,

        @Schema(example = "P@ssw0rd123")
        @NotBlank(message = "Mật khẩu là bắt buộc")
        String password
) {
}
