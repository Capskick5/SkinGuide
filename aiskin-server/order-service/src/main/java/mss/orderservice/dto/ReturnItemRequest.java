// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReturnItemRequest(
        @NotBlank(message = "productId là bắt buộc")
        @Size(max = 100, message = "productId không hợp lệ")
        String productId,

        @Size(max = 100, message = "variantId không hợp lệ")
        String variantId,

        @Size(max = 100, message = "Mã biến thể nội bộ không hợp lệ")
        String sku,

        @Size(max = 100, message = "Đơn vị sản phẩm không hợp lệ")
        String unit,

        @NotNull(message = "Số lượng trả là bắt buộc")
        @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
        Integer quantity
) {
}
