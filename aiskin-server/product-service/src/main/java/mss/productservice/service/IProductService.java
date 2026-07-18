package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.ProductIngredientRequest;
import mss.productservice.dto.request.ProductRequest;
import mss.productservice.dto.request.ProductVariantRequest;
import mss.productservice.dto.request.InventoryLevelRequest;
import mss.productservice.dto.response.InventoryLevelResponse;
import mss.productservice.dto.response.ProductIngredientResponse;
import mss.productservice.dto.response.ProductResponse;
import mss.productservice.dto.response.ProductVariantResponse;
import mss.productservice.dto.response.ProductSummaryResponse;
import mss.productservice.exception.DuplicateResourceException;
import mss.productservice.exception.ResourceNotFoundException;
import mss.productservice.model.Brand;
import mss.productservice.model.Category;
import mss.productservice.model.InventoryLevel;
import mss.productservice.model.Product;
import mss.productservice.model.ProductIngredient;
import mss.productservice.model.ProductVariant;
import mss.productservice.repository.BrandRepository;
import mss.productservice.repository.CategoryRepository;
import mss.productservice.repository.ProductRepository;
import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.util.SlugUtil;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public interface IProductService {

    void syncAllProductsToKafka();

    List<ProductSummaryResponse> getProducts(boolean includeInactive);

    List<ProductSummaryResponse> getActiveProducts();

    ProductResponse getProductById(String id, boolean includeInactive);

    ProductResponse getProductBySlug(String slug, boolean includeInactive);

    List<ProductSummaryResponse> getProductsByBrand(String brandId);

    List<ProductSummaryResponse> getProductsByCategory(String categoryId);

    List<ProductSummaryResponse> getProductsBySkinType(String skinType);

    List<ProductSummaryResponse> getProductsByConcern(String concern);

    List<ProductSummaryResponse> getProductsByIngredient(String ingredientId);

    List<ProductSummaryResponse> searchProducts(String keyword);

    Page<ProductSummaryResponse> searchAdvanced(ProductSearchRequest request, boolean includeInactive);

    ProductResponse createProduct(ProductRequest request);

    ProductResponse updateProduct(String id, ProductRequest request);

    void deleteProduct(String id);
}
