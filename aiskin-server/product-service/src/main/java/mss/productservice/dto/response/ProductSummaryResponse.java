package mss.productservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSummaryResponse {
    private String id;
    private String name;
    private String slug;
    private Double price;
    private String imageUrl;
    private String brandId;
    private String brandName;
    private String categoryId;
    private String categoryName;
    private Boolean isActive;
    
    // Minimal fields needed for client-side search indexing
    private List<String> targetConcerns;
    private List<String> targetSkinTypes;
    private List<String> keyIngredientIds;
    
    private Instant createdAt;
    private Instant updatedAt;
}
