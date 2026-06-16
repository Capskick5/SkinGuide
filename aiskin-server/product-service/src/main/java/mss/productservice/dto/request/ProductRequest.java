package mss.productservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
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
public class ProductRequest {

    @NotBlank(message = "Product name is required")
    @Size(max = 200, message = "Product name must not exceed 200 characters")
    private String name;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @Positive(message = "Price must be positive")
    private Double price;

    private String imageUrl;

    private List<String> images;

    @NotBlank(message = "Brand ID is required")
    private String brandId;

    @NotBlank(message = "Category ID is required")
    private String categoryId;

    private List<String> targetConcerns;

    private List<String> targetSkinTypes;

    private List<String> keyIngredientIds;

    private List<ProductIngredientRequest> ingredients;
}
