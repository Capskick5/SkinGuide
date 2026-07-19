// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for Google sign-in.
 */
public record GoogleLoginRequest(
        @NotBlank(message = "Google token không được để trống")
        String credential
) {
}
