package mss.orderservice.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductInventoryItemResponse {
    private String productId;
    private String productName;
    private String variantId;
    private String variantName;
    private String sku;
    private String imageUrl;
    private String unit;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subTotal;
}
