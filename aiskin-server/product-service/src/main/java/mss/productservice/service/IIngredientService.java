// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

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

public interface IIngredientService {

    List<IngredientResponse> getAllIngredients();

    IngredientResponse getIngredientById(String id);

    IngredientResponse getIngredientBySlug(String slug);

    List<IngredientResponse> searchIngredients(String keyword);

    List<IngredientResponse> getIngredientsByConcern(String concern);

    List<IngredientResponse> getIngredientsByBenefit(String benefit);

    List<IngredientResponse> getSafeIngredients(Integer maxEwgScore);

    IngredientResponse createIngredient(IngredientRequest request);

    IngredientResponse updateIngredient(String id, IngredientRequest request);

    void deleteIngredient(String id);
}
