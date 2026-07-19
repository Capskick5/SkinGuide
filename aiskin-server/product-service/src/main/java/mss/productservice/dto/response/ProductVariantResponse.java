// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantResponse {

    private String id;

    private String name;

    private String sku;

    private Double price;

    private String imageUrl;

    private String volume;

    private String unit;

    private Boolean isActive;

    private Boolean trackInventory;

    private Integer lowStockThreshold;

    private Integer onHandQuantity;

    private Integer reservedQuantity;

    private Integer availableQuantity;

    private Integer soldQuantity;

    private Boolean lowStock;

    private List<InventoryLevelResponse> inventoryLevels;
}
