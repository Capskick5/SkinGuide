// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "inventory_movements")
public class InventoryMovement {

    @Id
    private String id;

    @Indexed(unique = true, sparse = true)
    private String idempotencyKey;

    @Indexed
    private String productId;

    private String productName;

    @Indexed
    private String variantId;

    private String variantName;

    private String sku;

    @Indexed
    private String warehouseId;

    private String warehouseName;

    @Indexed
    private MovementType type;

    private Integer quantity;

    private Integer onHandBefore;

    private Integer onHandAfter;

    private Integer reservedBefore;

    private Integer reservedAfter;

    private Integer soldBefore;

    private Integer soldAfter;

    @Indexed
    private String referenceType;

    @Indexed
    private String referenceId;

    private String reason;

    @CreatedDate
    private Instant createdAt;

    public enum MovementType {
        RESERVE,
        RELEASE,
        COMMIT_SALE,
        RETURN_RESTOCK,
        RETURN_DAMAGED,
        STOCK_RECEIPT,
        STOCK_COUNT,
        STOCK_WRITE_OFF,
        ADJUSTMENT
    }
}
