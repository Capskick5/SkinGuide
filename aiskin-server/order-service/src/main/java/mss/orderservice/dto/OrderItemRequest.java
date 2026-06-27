package mss.orderservice.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItemRequest {
    private String productId;
    private String productName;
    private String imageUrl;
    private Integer quantity;
    private String unit;
    private BigDecimal unitPrice;
}
