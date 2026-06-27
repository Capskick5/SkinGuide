package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.ProductIngredientRequest;
import mss.productservice.dto.request.ProductRequest;
import mss.productservice.dto.response.ProductIngredientResponse;
import mss.productservice.dto.response.ProductResponse;
import mss.productservice.dto.response.ProductSummaryResponse;
import mss.productservice.exception.DuplicateResourceException;
import mss.productservice.exception.ResourceNotFoundException;
import mss.productservice.model.Brand;
import mss.productservice.model.Category;
import mss.productservice.model.Product;
import mss.productservice.model.ProductIngredient;
import mss.productservice.repository.BrandRepository;
import mss.productservice.repository.CategoryRepository;
import mss.productservice.repository.ProductRepository;
import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.util.SlugUtil;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final KafkaProductProducer kafkaProductProducer;

    public void syncAllProductsToKafka() {
        List<Product> products = enrichProducts(productRepository.findAll());
        productRepository.saveAll(products);
        kafkaProductProducer.sendBulkProducts(products);
    }

    public List<ProductSummaryResponse> getAllProducts() {
        return enrichProducts(productRepository.findAll()).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public List<ProductSummaryResponse> getActiveProducts() {
        return enrichProducts(productRepository.findByIsActiveTrue()).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public ProductResponse getProductById(String id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        enrichProduct(product);
        return toResponse(product);
    }

    public ProductResponse getProductBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        enrichProduct(product);
        return toResponse(product);
    }

    public List<ProductSummaryResponse> getProductsByBrand(String brandId) {
        return enrichProducts(productRepository.findByBrandId(brandId)).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public List<ProductSummaryResponse> getProductsByCategory(String categoryId) {
        return enrichProducts(productRepository.findByCategoryId(categoryId)).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public List<ProductSummaryResponse> getProductsBySkinType(String skinType) {
        return enrichProducts(productRepository.findByTargetSkinTypesContaining(skinType)).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public List<ProductSummaryResponse> getProductsByConcern(String concern) {
        return enrichProducts(productRepository.findByTargetConcernsContaining(concern)).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public List<ProductSummaryResponse> getProductsByIngredient(String ingredientId) {
        return enrichProducts(productRepository.findByKeyIngredientIdsContaining(ingredientId)).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public List<ProductSummaryResponse> searchProducts(String keyword) {
        return enrichProducts(productRepository.findByNameContainingIgnoreCase(keyword)).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public Page<ProductSummaryResponse> searchAdvanced(ProductSearchRequest request) {
        return productRepository.searchAdvanced(request).map(product -> toSummaryResponse(enrichProduct(product)));
    }

    public ProductResponse createProduct(ProductRequest request) {
        String slug = SlugUtil.toSlug(request.getName());
        if (productRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("Product", "slug", slug);
        }

        String brandName = resolveBrandName(request.getBrandId());
        String categoryName = resolveCategoryName(request.getCategoryId());
        Product product = Product.builder()
                .name(request.getName())
                .slug(slug)
                .description(request.getDescription())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .images(request.getImages())
                .brandId(request.getBrandId())
                .brandName(brandName)
                .categoryId(request.getCategoryId())
                .categoryName(categoryName)
                .targetConcerns(request.getTargetConcerns())
                .targetSkinTypes(request.getTargetSkinTypes())
                .keyIngredientIds(request.getKeyIngredientIds())
                .ingredients(mapIngredients(request.getIngredients()))
                .isActive(true)
                .build();

        Product saved = productRepository.save(product);
        kafkaProductProducer.sendProduct(saved);
        enrichProduct(saved);
        return toResponse(saved);
    }

    public ProductResponse updateProduct(String id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        String newSlug = SlugUtil.toSlug(request.getName());
        if (!newSlug.equals(product.getSlug()) && productRepository.existsBySlug(newSlug)) {
            throw new DuplicateResourceException("Product", "slug", newSlug);
        }

        product.setName(request.getName());
        product.setSlug(newSlug);
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setImageUrl(request.getImageUrl());
        product.setImages(request.getImages());
        product.setBrandId(request.getBrandId());
        product.setBrandName(resolveBrandName(request.getBrandId()));
        product.setCategoryId(request.getCategoryId());
        product.setCategoryName(resolveCategoryName(request.getCategoryId()));
        product.setTargetConcerns(request.getTargetConcerns());
        product.setTargetSkinTypes(request.getTargetSkinTypes());
        product.setKeyIngredientIds(request.getKeyIngredientIds());
        product.setIngredients(mapIngredients(request.getIngredients()));

        Product saved = productRepository.save(product);
        kafkaProductProducer.sendProduct(saved);
        enrichProduct(saved);
        return toResponse(saved);
    }

    public void deleteProduct(String id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        product.setIsActive(false);
        Product saved = productRepository.save(product);
        kafkaProductProducer.sendProduct(enrichProduct(saved));
    }

    private List<ProductIngredient> mapIngredients(List<ProductIngredientRequest> requests) {
        if (requests == null) return Collections.emptyList();
        return requests.stream()
                .map(r -> ProductIngredient.builder()
                        .ingredientId(r.getIngredientId())
                        .name(r.getName())
                        .percentage(r.getPercentage())
                        .isKey(r.getIsKey())
                        .concerns(r.getConcerns())
                        .build())
                .toList();
    }

    private Product enrichProduct(Product product) {
        if (product == null) {
            return null;
        }

        if (product.getBrandId() != null && (product.getBrandName() == null || product.getBrandName().isBlank())) {
            product.setBrandName(resolveBrandName(product.getBrandId()));
        }
        if (product.getCategoryId() != null && (product.getCategoryName() == null || product.getCategoryName().isBlank())) {
            product.setCategoryName(resolveCategoryName(product.getCategoryId()));
        }
        return product;
    }

    private List<Product> enrichProducts(List<Product> products) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> brandIds = products.stream()
                .map(Product::getBrandId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());
        Set<String> categoryIds = products.stream()
                .map(Product::getCategoryId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());

        var brandNameMap = brandRepository.findAllById(brandIds).stream()
                .collect(Collectors.toMap(Brand::getId, Brand::getName));
        var categoryNameMap = categoryRepository.findAllById(categoryIds).stream()
                .collect(Collectors.toMap(Category::getId, Category::getName));

        for (Product product : products) {
            if (product.getBrandId() != null) {
                product.setBrandName(brandNameMap.get(product.getBrandId()));
            }
            if (product.getCategoryId() != null) {
                product.setCategoryName(categoryNameMap.get(product.getCategoryId()));
            }
        }

        return products;
    }

    private String resolveBrandName(String brandId) {
        return brandRepository.findByIdAndIsActiveTrue(brandId)
                .map(Brand::getName)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "active id", brandId));
    }

    private String resolveCategoryName(String categoryId) {
        return categoryRepository.findByIdAndIsActiveTrue(categoryId)
                .map(Category::getName)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "active id", categoryId));
    }

    private ProductResponse toResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .description(product.getDescription())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .images(product.getImages())
                .brandId(product.getBrandId())
                .brandName(product.getBrandName())
                .categoryId(product.getCategoryId())
                .categoryName(product.getCategoryName())
                .targetConcerns(product.getTargetConcerns())
                .targetSkinTypes(product.getTargetSkinTypes())
                .keyIngredientIds(product.getKeyIngredientIds())
                .ingredients(mapIngredientResponses(product.getIngredients()))
                .isActive(product.getIsActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private ProductSummaryResponse toSummaryResponse(Product product) {
        return ProductSummaryResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .brandId(product.getBrandId())
                .brandName(product.getBrandName())
                .categoryId(product.getCategoryId())
                .categoryName(product.getCategoryName())
                .isActive(product.getIsActive())
                .targetConcerns(product.getTargetConcerns())
                .targetSkinTypes(product.getTargetSkinTypes())
                .keyIngredientIds(product.getKeyIngredientIds())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private List<ProductIngredientResponse> mapIngredientResponses(List<ProductIngredient> ingredients) {
        if (ingredients == null) return Collections.emptyList();
        return ingredients.stream()
                .map(i -> ProductIngredientResponse.builder()
                        .ingredientId(i.getIngredientId())
                        .name(i.getName())
                        .percentage(i.getPercentage())
                        .isKey(i.getIsKey())
                        .concerns(i.getConcerns())
                        .build())
                .toList();
    }
}
