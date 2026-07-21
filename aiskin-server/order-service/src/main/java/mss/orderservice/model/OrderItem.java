// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {
    private String productId;
    private String variantId;
    private String sku;
    private String variantName;
    private String productName;
    private String imageUrl;
    private Integer quantity;
    private String unit;
    private BigDecimal unitPrice;
    private BigDecimal subTotal;
}
