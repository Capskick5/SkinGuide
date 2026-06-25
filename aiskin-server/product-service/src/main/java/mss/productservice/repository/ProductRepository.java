package mss.productservice.repository;

import mss.productservice.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends MongoRepository<Product, String>, ProductRepositoryCustom {

    Optional<Product> findBySlug(String slug);

    List<Product> findByBrandId(String brandId);

    List<Product> findByCategoryId(String categoryId);

    List<Product> findByIsActiveTrue();

    List<Product> findByTargetSkinTypesContaining(String skinType);

    List<Product> findByTargetConcernsContaining(String concern);

    List<Product> findByKeyIngredientIdsContaining(String ingredientId);

    List<Product> findByNameContainingIgnoreCase(String keyword);

    boolean existsBySlug(String slug);
}
