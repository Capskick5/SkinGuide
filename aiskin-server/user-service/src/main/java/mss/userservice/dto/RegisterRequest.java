// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload for POST /api/auth/register.
 */
public record RegisterRequest(

        @Schema(example = "user@example.com")
        @NotBlank(message = "Email là bắt buộc")
        @Email(message = "Email không hợp lệ")
        String email,

        @Schema(example = "P@ssw0rd123")
        @NotBlank(message = "Mật khẩu là bắt buộc")
        @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
        String password,

        @Schema(example = "Nguyễn Văn A")
        String fullName
) {
}
