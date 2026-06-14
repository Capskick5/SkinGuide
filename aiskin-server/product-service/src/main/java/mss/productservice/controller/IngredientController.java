package mss.productservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.IngredientRequest;
import mss.productservice.dto.response.ApiResponse;
import mss.productservice.dto.response.IngredientResponse;
import mss.productservice.service.IngredientService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<IngredientResponse>>> getAllIngredients() {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.getAllIngredients()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IngredientResponse>> getIngredientById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.getIngredientById(id)));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<IngredientResponse>> getIngredientBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.getIngredientBySlug(slug)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<IngredientResponse>>> searchIngredients(@RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.searchIngredients(keyword)));
    }

    @GetMapping("/by-concern")
    public ResponseEntity<ApiResponse<List<IngredientResponse>>> getByConcern(@RequestParam String concern) {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.getIngredientsByConcern(concern)));
    }

    @GetMapping("/by-benefit")
    public ResponseEntity<ApiResponse<List<IngredientResponse>>> getByBenefit(@RequestParam String benefit) {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.getIngredientsByBenefit(benefit)));
    }

    @GetMapping("/safe")
    public ResponseEntity<ApiResponse<List<IngredientResponse>>> getSafeIngredients(
            @RequestParam(defaultValue = "3") Integer maxEwgScore) {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.getSafeIngredients(maxEwgScore)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<IngredientResponse>> createIngredient(@Valid @RequestBody IngredientRequest request) {
        IngredientResponse created = ingredientService.createIngredient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Ingredient created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<IngredientResponse>> updateIngredient(@PathVariable String id,
                                                                             @Valid @RequestBody IngredientRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Ingredient updated", ingredientService.updateIngredient(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIngredient(@PathVariable String id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.ok(ApiResponse.ok("Ingredient deleted", null));
    }
}
