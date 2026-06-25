package mss.productservice.repository;

import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.model.Product;
import org.springframework.data.domain.Page;

public interface ProductRepositoryCustom {
    Page<Product> searchAdvanced(ProductSearchRequest request);
}
