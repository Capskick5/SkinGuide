package mss.productservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryReservationItemResponse {

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
