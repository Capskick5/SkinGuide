// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

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
public class IngredientResponse {

    private String id;
    private String name;
    private String slug;
    private List<String> aliases;
    private String description;
    private List<String> benefits;
    private List<String> concerns;
    private List<String> contraindications;
    private Integer ewgScore;
    private Instant createdAt;
    private Instant updatedAt;
}
