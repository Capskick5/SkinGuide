package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.IngredientRequest;
import mss.productservice.dto.response.IngredientResponse;
import mss.productservice.exception.DuplicateResourceException;
import mss.productservice.exception.ResourceNotFoundException;
import mss.productservice.model.Ingredient;
import mss.productservice.repository.IngredientRepository;
import mss.productservice.util.SlugUtil;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IngredientService implements IIngredientService {

    private final IngredientRepository ingredientRepository;

    public List<IngredientResponse> getAllIngredients() {
        return ingredientRepository.findAll().stream().map(this::toResponse).toList();
    }

    public IngredientResponse getIngredientById(String id) {
        Ingredient ingredient = ingredientRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Ingredient", "id", id));
        return toResponse(ingredient);
    }

    public IngredientResponse getIngredientBySlug(String slug) {
        Ingredient ingredient = ingredientRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Ingredient", "slug", slug));
        return toResponse(ingredient);
    }

    public List<IngredientResponse> searchIngredients(String keyword) {
        return ingredientRepository.findByNameContainingIgnoreCase(keyword).stream().map(this::toResponse).toList();
    }

    public List<IngredientResponse> getIngredientsByConcern(String concern) {
        return ingredientRepository.findByConcernsContaining(concern).stream().map(this::toResponse).toList();
    }

    public List<IngredientResponse> getIngredientsByBenefit(String benefit) {
        return ingredientRepository.findByBenefitsContaining(benefit).stream().map(this::toResponse).toList();
    }

    public List<IngredientResponse> getSafeIngredients(Integer maxEwgScore) {
        return ingredientRepository.findByEwgScoreLessThanEqual(maxEwgScore).stream().map(this::toResponse).toList();
    }

    public IngredientResponse createIngredient(IngredientRequest request) {
        String slug = SlugUtil.toSlug(request.getName());
        if (ingredientRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("Ingredient", "slug", slug);
        }
        Ingredient ingredient = Ingredient.builder().name(request.getName()).slug(slug).aliases(request.getAliases()).description(request.getDescription()).benefits(request.getBenefits()).concerns(request.getConcerns()).contraindications(request.getContraindications()).ewgScore(request.getEwgScore()).build();
        return toResponse(ingredientRepository.save(ingredient));
    }

    public IngredientResponse updateIngredient(String id, IngredientRequest request) {
        Ingredient ingredient = ingredientRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Ingredient", "id", id));
        String newSlug = SlugUtil.toSlug(request.getName());
        if (!newSlug.equals(ingredient.getSlug()) && ingredientRepository.existsBySlug(newSlug)) {
            throw new DuplicateResourceException("Ingredient", "slug", newSlug);
        }
        ingredient.setName(request.getName());
        ingredient.setSlug(newSlug);
        ingredient.setAliases(request.getAliases());
        ingredient.setDescription(request.getDescription());
        ingredient.setBenefits(request.getBenefits());
        ingredient.setConcerns(request.getConcerns());
        ingredient.setContraindications(request.getContraindications());
        ingredient.setEwgScore(request.getEwgScore());
        return toResponse(ingredientRepository.save(ingredient));
    }

    public void deleteIngredient(String id) {
        if (!ingredientRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ingredient", "id", id);
        }
        ingredientRepository.deleteById(id);
    }

    private IngredientResponse toResponse(Ingredient ingredient) {
        return IngredientResponse.builder().id(ingredient.getId()).name(ingredient.getName()).slug(ingredient.getSlug()).aliases(ingredient.getAliases()).description(ingredient.getDescription()).benefits(ingredient.getBenefits()).concerns(ingredient.getConcerns()).contraindications(ingredient.getContraindications()).ewgScore(ingredient.getEwgScore()).createdAt(ingredient.getCreatedAt()).updatedAt(ingredient.getUpdatedAt()).build();
    }
}
