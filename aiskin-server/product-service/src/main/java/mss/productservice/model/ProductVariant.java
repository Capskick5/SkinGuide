package mss.productservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariant {

    private String id;

    private String name;

    private String sku;

    private Double price;

    private String imageUrl;

    private String volume;

    private String unit;

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private Boolean trackInventory = true;

    @Builder.Default
    private Integer lowStockThreshold = 5;

    private List<InventoryLevel> inventoryLevels;
}
