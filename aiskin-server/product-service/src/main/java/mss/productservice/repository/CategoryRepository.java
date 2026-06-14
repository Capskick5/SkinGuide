package mss.productservice.repository;

import mss.productservice.model.Category;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends MongoRepository<Category, String> {

    Optional<Category> findBySlug(String slug);

    List<Category> findByIsActiveTrueOrderByDisplayOrderAsc();

    List<Category> findByNameContainingIgnoreCase(String keyword);

    boolean existsBySlug(String slug);
}
