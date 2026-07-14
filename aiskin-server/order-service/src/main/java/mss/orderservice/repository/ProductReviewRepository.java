package mss.orderservice.repository;

import mss.orderservice.model.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ProductReviewRepository extends MongoRepository<ProductReview, String> {
    Optional<ProductReview> findByCustomerIdAndProductId(String customerId, String productId);
    Page<ProductReview> findByProductIdOrderByCreatedAtDesc(String productId, Pageable pageable);
    List<ProductReview> findByProductId(String productId);
}
