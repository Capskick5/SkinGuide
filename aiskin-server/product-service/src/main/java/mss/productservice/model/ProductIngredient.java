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
public class ProductIngredient {

    private String ingredientId;

    private String name;

    private Double percentage;

    private Boolean isKey;

    private List<String> concerns;
}
