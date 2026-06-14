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
public class ProductResponse {

    private String id;
    private String name;
    private String slug;
    private String description;
    private Double price;
    private String imageUrl;
    private List<String> images;
    private String brandId;
    private String categoryId;
    private List<String> targetConcerns;
    private List<String> targetSkinTypes;
    private List<String> keyIngredientIds;
    private List<ProductIngredientResponse> ingredients;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
