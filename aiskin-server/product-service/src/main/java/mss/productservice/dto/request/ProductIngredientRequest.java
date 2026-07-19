// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductIngredientRequest {

    @NotBlank(message = "Ingredient ID is required")
    private String ingredientId;

    @NotBlank(message = "Ingredient name is required")
    private String name;

    @Min(value = 0, message = "Percentage must be between 0 and 100")
    @Max(value = 100, message = "Percentage must be between 0 and 100")
    private Double percentage;

    private Boolean isKey;

    private List<String> concerns;
}
