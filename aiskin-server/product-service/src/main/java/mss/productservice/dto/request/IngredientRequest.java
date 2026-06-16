package mss.productservice.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class IngredientRequest {

    @NotBlank(message = "Ingredient name is required")
    @Size(max = 150, message = "Ingredient name must not exceed 150 characters")
    private String name;

    private List<String> aliases;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    private List<String> benefits;

    private List<String> concerns;

    private List<String> contraindications;

    @Min(value = 1, message = "EWG score must be between 1 and 10")
    @Max(value = 10, message = "EWG score must be between 1 and 10")
    private Integer ewgScore;
}
