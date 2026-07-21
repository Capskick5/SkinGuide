// Project: SkinGuide - MSS301
// Service Component

package mss.userservice.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Một địa chỉ giao hàng trong sổ địa chỉ của người dùng.
 * Nhúng trong User (không phải collection riêng) - danh sách {@code User.addresses}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Address {

    /** Sinh UUID khi thêm mới; dùng để sửa/xóa/đặt mặc định. */
    private String id;

    /** Nhãn tùy chọn, ví dụ "Nhà", "Công ty". */
    private String label;

    @NotBlank
    @Size(max = 100)
    private String customerName;

    @NotBlank
    @Pattern(regexp = "^[0-9+() .-]{8,20}$")
    private String customerPhone;

    @NotBlank
    private String provinceCode;

    @NotBlank
    @Size(max = 100)
    private String city;

    @NotBlank
    private String districtCode;

    @NotBlank
    @Size(max = 100)
    private String district;

    @NotBlank
    private String wardCode;

    @NotBlank
    @Size(max = 100)
    private String ward;

    @NotBlank
    @Size(max = 255)
    private String addressDetail;

    /** Địa chỉ giao hàng mặc định (chỉ một địa chỉ mặc định tại một thời điểm). */
    @Builder.Default
    private boolean isDefault = false;
}
