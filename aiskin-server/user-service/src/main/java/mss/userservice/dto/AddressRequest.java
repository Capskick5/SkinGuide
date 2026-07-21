// Project: SkinGuide - MSS301
// Service Component

package mss.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Payload for POST/PUT /api/users/me/addresses (authenticated).
 */
public record AddressRequest(
        String label,
        @NotBlank @Size(max = 100) String customerName,
        @NotBlank @Pattern(regexp = "^[0-9+() .-]{8,20}$") String customerPhone,
        @NotBlank String provinceCode,
        @NotBlank @Size(max = 100) String city,
        @NotBlank String districtCode,
        @NotBlank @Size(max = 100) String district,
        @NotBlank String wardCode,
        @NotBlank @Size(max = 100) String ward,
        @NotBlank @Size(max = 255) String addressDetail
) {
}
