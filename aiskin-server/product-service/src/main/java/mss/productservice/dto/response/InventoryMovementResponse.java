package mss.productservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryMovementResponse {

    private String id;

    private String idempotencyKey;

    private String productId;

    private String productName;

    private String variantId;

    private String variantName;

    private String sku;

    private String warehouseId;

    private String warehouseName;

    private String type;

    private Integer quantity;

    private Integer onHandBefore;

    private Integer onHandAfter;

    private Integer reservedBefore;

    private Integer reservedAfter;

    private Integer soldBefore;

    private Integer soldAfter;

    private String referenceType;

    private String referenceId;

    private String reason;

    private Instant createdAt;
}
