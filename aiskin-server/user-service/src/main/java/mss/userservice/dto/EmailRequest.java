package mss.userservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload for endpoints that take only an email
 * (request email verification OTP, forgot password).
 */
public record EmailRequest(

        @Schema(example = "user@example.com")
        @NotBlank(message = "Email là bắt buộc")
        @Email(message = "Email không hợp lệ")
        String email
) {
}
