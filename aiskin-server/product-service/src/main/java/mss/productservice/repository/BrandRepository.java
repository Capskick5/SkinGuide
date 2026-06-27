package mss.productservice.repository;

import mss.productservice.model.Brand;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends MongoRepository<Brand, String> {

    Optional<Brand> findBySlug(String slug);

    Optional<Brand> findByIdAndIsActiveTrue(String id);

    List<Brand> findByIsActiveTrue();

    List<Brand> findByCountryIgnoreCase(String country);

    List<Brand> findByNameContainingIgnoreCase(String keyword);

    boolean existsBySlug(String slug);
}
