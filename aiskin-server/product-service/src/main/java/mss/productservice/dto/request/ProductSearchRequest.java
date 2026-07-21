// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSearchRequest {
    private String query;
    private String searchField; // "all", "name", "slug", "brand", "category", "ingredient", "concern"
    private String categoryId; // "all" or specific category ID
    private Boolean isActive; // null (all), true (active), false (inactive)
    private String sortBy; // "relevance", "name-asc", "name-desc", "price-asc", "price-desc"
    private Double minPrice; // null = không giới hạn giá thấp
    private Double maxPrice; // null = không giới hạn giá cao
    private String brandId; // "all" or specific brand ID, độc lập với categoryId
    private String skinType; // "all" or specific skin type (khớp Product.targetSkinTypes)
    private String concern; // "all" or specific concern (khớp Product.targetConcerns)
    private Boolean inStockOnly; // true = chỉ trả sản phẩm còn hàng bán được (available > 0)
    @Builder.Default
    private int page = 1;
    @Builder.Default
    private int size = 12;
}
