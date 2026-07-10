package mss.productservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryLevel {

    private String warehouseId;

    private String warehouseName;

    @Builder.Default
    private Integer onHandQuantity = 0;

    @Builder.Default
    private Integer reservedQuantity = 0;

    @Builder.Default
    private Integer soldQuantity = 0;
}
