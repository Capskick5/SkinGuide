package mss.orderservice.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

@Data
public class OrderItemRequest {
    @NotBlank(message = "productId là bắt buộc")
    private String productId;
    private String variantId;
    private String productName;
    private String imageUrl;
    @NotNull(message = "Số lượng là bắt buộc")
    @Positive(message = "Số lượng phải lớn hơn 0")
    private Integer quantity;
    private String unit;
    private BigDecimal unitPrice;
}
