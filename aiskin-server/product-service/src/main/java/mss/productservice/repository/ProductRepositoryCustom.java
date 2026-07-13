package mss.productservice.repository;

import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.model.Product;
import org.springframework.data.domain.Page;

import java.util.Optional;
import java.util.Collection;
import java.util.List;

public interface ProductRepositoryCustom {
    Page<Product> searchAdvanced(ProductSearchRequest request);

    Optional<Product> findByFlexibleId(String id);

    Product saveFlexible(Product product);

    List<Product> saveAllFlexible(Collection<Product> products);
}
