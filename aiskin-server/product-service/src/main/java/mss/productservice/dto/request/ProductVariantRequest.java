// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantRequest {

    private String id;

    @Size(max = 120, message = "Variant name must not exceed 120 characters")
    private String name;

    @Size(max = 80, message = "Mã biến thể nội bộ không được vượt quá 80 ký tự")
    private String sku;

    @PositiveOrZero(message = "Variant price must not be negative")
    private Double price;

    private String imageUrl;

    private String volume;

    private String unit;

    private Boolean isActive;

    private Boolean trackInventory;

    @PositiveOrZero(message = "Low stock threshold must not be negative")
    private Integer lowStockThreshold;

    @Valid
    private List<InventoryLevelRequest> inventoryLevels;
}
