// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.repository;

import mss.productservice.model.Ingredient;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IngredientRepository extends MongoRepository<Ingredient, String> {

    Optional<Ingredient> findBySlug(String slug);

    List<Ingredient> findByConcernsContaining(String concern);

    List<Ingredient> findByBenefitsContaining(String benefit);

    List<Ingredient> findByNameContainingIgnoreCase(String keyword);

    List<Ingredient> findByEwgScoreLessThanEqual(Integer score);

    boolean existsBySlug(String slug);
}
