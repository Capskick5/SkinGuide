package mss.productservice.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryLevelRequest {

    private String warehouseId;

    private String warehouseName;

    @PositiveOrZero(message = "On hand quantity must not be negative")
    private Integer onHandQuantity;

    @PositiveOrZero(message = "Reserved quantity must not be negative")
    private Integer reservedQuantity;

    @PositiveOrZero(message = "Sold quantity must not be negative")
    private Integer soldQuantity;
}
