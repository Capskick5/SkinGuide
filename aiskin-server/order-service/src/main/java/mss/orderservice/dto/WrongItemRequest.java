package mss.orderservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Sản phẩm khách thực tế nhận nhầm. Đây là dữ liệu được nhập lại kho trong
 * luồng WRONG_ITEM; không được dùng sản phẩm khách đáng lẽ nhận để cộng kho.
 */
public record WrongItemRequest(
        @NotBlank(message = "productId của hàng giao sai là bắt buộc")
        @Size(max = 100)
        String productId,

        @NotBlank(message = "variantId của hàng giao sai là bắt buộc")
        @Size(max = 100)
        String variantId,

        @Size(max = 100)
        String sku,

        @NotBlank(message = "Tên hàng giao sai là bắt buộc")
        @Size(max = 250)
        String productName,

        @Size(max = 150)
        String variantName,

        @NotNull
        @Min(value = 1, message = "Số lượng hàng giao sai phải lớn hơn 0")
        Integer quantity
) {
}
