package mss.productservice.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryAdjustmentRequest {

    @NotBlank(message = "Product id is required")
    @Schema(description = "Product containing the inventory variant")
    private String productId;

    @NotBlank(message = "Variant id is required")
    @Schema(description = "Variant/SKU being updated")
    private String variantId;

    @Schema(description = "Warehouse id; defaults to MAIN_WAREHOUSE", example = "MAIN_WAREHOUSE")
    private String warehouseId;

    @Builder.Default
    @Schema(description = "RECEIPT adds stock, COUNT sets the physical count, WRITE_OFF removes unusable stock")
    private OperationType operationType = OperationType.ADJUSTMENT;

    @Schema(description = "Signed change. Positive for RECEIPT, negative for WRITE_OFF. Optional for COUNT when targetQuantity is provided")
    private Integer quantityDelta;

    @Schema(description = "Exact physical quantity counted; authoritative for COUNT", example = "35")
    private Integer targetQuantity;

    @NotBlank(message = "Adjustment reason is required")
    @Schema(description = "Reason stored in the inventory audit history", example = "Kiểm kê cuối ngày")
    private String reason;

    public enum OperationType {
        RECEIPT,
        COUNT,
        WRITE_OFF,
        ADJUSTMENT
    }
}
