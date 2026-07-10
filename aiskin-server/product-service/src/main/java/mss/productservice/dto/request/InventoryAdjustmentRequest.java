package mss.productservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
    private String productId;

    @NotBlank(message = "Variant id is required")
    private String variantId;

    private String warehouseId;

    @NotNull(message = "Quantity delta is required")
    private Integer quantityDelta;

    @NotBlank(message = "Adjustment reason is required")
    private String reason;
}
