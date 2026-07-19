// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload for POST /api/users/me/change-password (authenticated).
 */
public record ChangePasswordRequest(

        @NotBlank(message = "Mật khẩu hiện tại là bắt buộc")
        String currentPassword,

        @NotBlank(message = "Mật khẩu mới là bắt buộc")
        @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
        String newPassword
) {
}
