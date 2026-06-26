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
    private int page = 1;
    private int size = 12;
}
