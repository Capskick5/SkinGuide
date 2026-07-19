// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.dto;

import lombok.Data;
import mss.orderservice.model.Order.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

@Data
public class OrderRequest {
    private String customerId; // Optional if guest
    @NotBlank(message = "Tên người nhận là bắt buộc")
    private String customerName;
    @NotBlank(message = "Số điện thoại người nhận là bắt buộc")
    private String customerPhone;
    @NotBlank(message = "Địa chỉ giao hàng là bắt buộc")
    private String shippingAddress;
    private String customerNote;

    @NotNull(message = "Quận/huyện GHN là bắt buộc")
    @Positive(message = "Mã quận/huyện GHN không hợp lệ")
    private Integer ghnDistrictId;
    @NotBlank(message = "Phường/xã GHN là bắt buộc")
    private String ghnWardCode;
    // Chỉ dùng để hiển thị phía client; backend luôn tính lại bằng GHN.
    private java.math.BigDecimal shippingFee;

    @Valid
    @NotEmpty(message = "Đơn hàng phải có ít nhất một sản phẩm")
    private List<OrderItemRequest> items;
    @NotNull(message = "Phương thức thanh toán là bắt buộc")
    private PaymentMethod paymentMethod;
}
