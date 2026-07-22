// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.service.impl;

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
import mss.productservice.dto.response.FlashDealResponse;
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
import java.math.BigDecimal;
import java.time.Instant;
import mss.productservice.service.*;

@Service
@RequiredArgsConstructor
public class ProductService implements IProductService {

    private static final String DEFAULT_WAREHOUSE_ID = "MAIN_WAREHOUSE";

    private static final String DEFAULT_WAREHOUSE_NAME = "Kho chính";

    private final ProductRepository productRepository;

    private final BrandRepository brandRepository;

    private final CategoryRepository categoryRepository;

    private final KafkaProductProducer kafkaProductProducer;

    private final FlashDealPolicy flashDealPolicy;

    public void syncAllProductsToKafka() {
        List<Product> products = enrichProducts(productRepository.findAll());
        productRepository.saveAllFlexible(products);
        kafkaProductProducer.sendBulkProducts(products);
    }

    public List<ProductSummaryResponse> getProducts(boolean includeInactive) {
        List<Product> products = includeInactive ? productRepository.findAll() : productRepository.findByIsActiveTrue();
        return enrichProducts(products).stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductSummaryResponse> getActiveProducts() {
        return enrichProducts(productRepository.findByIsActiveTrue()).stream().map(this::toSummaryResponse).toList();
    }

    public List<FlashDealResponse> getFlashDeals() {
        List<ProductSummaryResponse> activeProducts = getActiveProducts();
        Set<String> dealIds = flashDealPolicy.selectProductIds(activeProducts.stream().map(ProductSummaryResponse::getId).toList());
        Instant startsAt = flashDealPolicy.startsAt();
        Instant endsAt = flashDealPolicy.endsAt();
        return activeProducts.stream().filter(product -> dealIds.contains(product.getId())).map(product -> {
            int discount = flashDealPolicy.discountPercent(product.getCategoryId());
            BigDecimal original = BigDecimal.valueOf(product.getPrice() == null ? 0 : product.getPrice());
            return FlashDealResponse.builder().product(product).discountPercent(discount)
                    .originalPrice(original.doubleValue()).dealPrice(flashDealPolicy.dealPrice(original, discount).doubleValue())
                    .startsAt(startsAt).endsAt(endsAt).build();
        }).toList();
    }

    public ProductResponse getProductById(String id, boolean includeInactive) {
        Product product = productRepository.findByFlexibleId(id).orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        requireVisible(product, includeInactive);
        enrichProduct(product);
        return toResponse(product);
    }

    public ProductResponse getProductBySlug(String slug, boolean includeInactive) {
        Product product = productRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        requireVisible(product, includeInactive);
        enrichProduct(product);
        return toResponse(product);
    }

    public List<ProductSummaryResponse> getProductsByBrand(String brandId) {
        return enrichProducts(productRepository.findByBrandId(brandId)).stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductSummaryResponse> getProductsByCategory(String categoryId) {
        return enrichProducts(productRepository.findByCategoryId(categoryId)).stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductSummaryResponse> getProductsBySkinType(String skinType) {
        return enrichProducts(productRepository.findByTargetSkinTypesContaining(skinType)).stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductSummaryResponse> getProductsByConcern(String concern) {
        return enrichProducts(productRepository.findByTargetConcernsContaining(concern)).stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductSummaryResponse> getProductsByIngredient(String ingredientId) {
        return enrichProducts(productRepository.findByKeyIngredientIdsContaining(ingredientId)).stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductSummaryResponse> searchProducts(String keyword) {
        return enrichProducts(productRepository.findByNameContainingIgnoreCase(keyword)).stream().map(this::toSummaryResponse).toList();
    }

    public Page<ProductSummaryResponse> searchAdvanced(ProductSearchRequest request, boolean includeInactive) {
        if (!includeInactive) {
            request.setIsActive(true);
        }
        return productRepository.searchAdvanced(request).map(product -> toSummaryResponse(enrichProduct(product)));
    }

    private void requireVisible(Product product, boolean includeInactive) {
        if (!includeInactive && !Boolean.TRUE.equals(product.getIsActive())) {
            throw new ResourceNotFoundException("Product", "id", product.getId());
        }
    }

    public ProductResponse createProduct(ProductRequest request) {
        String slug = SlugUtil.toSlug(request.getName());
        if (productRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("Product", "slug", slug);
        }
        String brandName = resolveBrandName(request.getBrandId());
        String categoryName = resolveCategoryName(request.getCategoryId());
        Product product = Product.builder().name(request.getName()).slug(slug).description(request.getDescription()).price(request.getPrice()).imageUrl(request.getImageUrl()).images(request.getImages()).brandId(request.getBrandId()).brandName(brandName).categoryId(request.getCategoryId()).categoryName(categoryName).targetConcerns(request.getTargetConcerns()).targetSkinTypes(request.getTargetSkinTypes()).keyIngredientIds(request.getKeyIngredientIds()).ingredients(mapIngredients(request.getIngredients())).variants(mapVariantsForCreate(request, slug)).isActive(true).build();
        Product saved = productRepository.save(product);
        kafkaProductProducer.sendProduct(saved);
        enrichProduct(saved);
        return toResponse(saved);
    }

    public ProductResponse updateProduct(String id, ProductRequest request) {
        Product product = productRepository.findByFlexibleId(id).orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
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
        if (request.getVariants() != null) {
            product.setVariants(mapVariantsForUpdate(request.getVariants(), product.getVariants(), product.getSlug()));
        }
        Product saved = productRepository.saveFlexible(product);
        kafkaProductProducer.sendProduct(saved);
        enrichProduct(saved);
        return toResponse(saved);
    }

    public void deleteProduct(String id) {
        Product product = productRepository.findByFlexibleId(id).orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        product.setIsActive(false);
        Product saved = productRepository.saveFlexible(product);
        kafkaProductProducer.sendProduct(enrichProduct(saved));
    }

    private List<ProductIngredient> mapIngredients(List<ProductIngredientRequest> requests) {
        if (requests == null)
            return Collections.emptyList();
        return requests.stream().map(r -> ProductIngredient.builder().ingredientId(r.getIngredientId()).name(r.getName()).percentage(r.getPercentage()).isKey(r.getIsKey()).concerns(r.getConcerns()).build()).toList();
    }

    private List<ProductVariant> mapVariantsForCreate(ProductRequest request, String productSlug) {
        if (request.getVariants() == null || request.getVariants().isEmpty()) {
            return List.of(createDefaultVariant(request, productSlug));
        }
        return mapVariantsForUpdate(request.getVariants(), Collections.emptyList(), productSlug);
    }

    private ProductVariant createDefaultVariant(ProductRequest request, String productSlug) {
        return ProductVariant.builder().id(UUID.randomUUID().toString()).name("Default").sku((productSlug + "-default").toUpperCase()).price(request.getPrice()).imageUrl(request.getImageUrl()).volume(null).unit(null).isActive(true).trackInventory(true).lowStockThreshold(5).inventoryLevels(List.of(defaultInventoryLevel())).build();
    }

    private List<ProductVariant> mapVariantsForUpdate(List<ProductVariantRequest> requests, List<ProductVariant> existingVariants, String productSlug) {
        if (requests == null) {
            return existingVariants == null ? Collections.emptyList() : existingVariants;
        }
        Set<String> seenSkus = new java.util.HashSet<>();
        List<ProductVariant> existing = existingVariants == null ? Collections.emptyList() : existingVariants;
        List<ProductVariant> mapped = new ArrayList<>();
        for (int index = 0; index < requests.size(); index++) {
            ProductVariantRequest request = requests.get(index);
            String variantId = hasText(request.getId()) ? request.getId() : UUID.randomUUID().toString();
            ProductVariant previous = findVariant(existing, variantId);
            String sku = hasText(request.getSku()) ? request.getSku().trim() : generateVariantSku(productSlug, index + 1);
            String normalizedSku = sku.toUpperCase();
            if (!seenSkus.add(normalizedSku)) {
                throw new DuplicateResourceException("ProductVariant", "sku", normalizedSku);
            }
            ProductVariant variant = ProductVariant.builder().id(variantId).name(hasText(request.getName()) ? request.getName().trim() : "Variant " + (index + 1)).sku(normalizedSku).price(request.getPrice()).imageUrl(request.getImageUrl()).volume(request.getVolume()).unit(request.getUnit()).isActive(request.getIsActive() != null ? request.getIsActive() : true).trackInventory(request.getTrackInventory() != null ? request.getTrackInventory() : true).lowStockThreshold(request.getLowStockThreshold() != null ? request.getLowStockThreshold() : 5).inventoryLevels(mapInventoryLevels(request.getInventoryLevels(), previous)).build();
            mapped.add(variant);
        }
        return mapped;
    }

    private List<InventoryLevel> mapInventoryLevels(List<InventoryLevelRequest> requests, ProductVariant previous) {
        if (requests == null) {
            if (previous != null && previous.getInventoryLevels() != null && !previous.getInventoryLevels().isEmpty()) {
                return previous.getInventoryLevels();
            }
            return List.of(defaultInventoryLevel());
        }
        List<InventoryLevel> levels = new ArrayList<>();
        for (InventoryLevelRequest request : requests) {
            String warehouseId = hasText(request.getWarehouseId()) ? request.getWarehouseId().trim() : DEFAULT_WAREHOUSE_ID;
            String warehouseName = hasText(request.getWarehouseName()) ? request.getWarehouseName().trim() : DEFAULT_WAREHOUSE_NAME;
            int onHand = nonNegative(request.getOnHandQuantity());
            int reserved = nonNegative(request.getReservedQuantity());
            int sold = nonNegative(request.getSoldQuantity());
            if (reserved > onHand) {
                throw new IllegalArgumentException("Reserved quantity cannot exceed on hand quantity for warehouse " + warehouseId);
            }
            levels.add(InventoryLevel.builder().warehouseId(warehouseId).warehouseName(warehouseName).onHandQuantity(onHand).reservedQuantity(reserved).soldQuantity(sold).build());
        }
        return levels.isEmpty() ? List.of(defaultInventoryLevel()) : levels;
    }

    private InventoryLevel defaultInventoryLevel() {
        return InventoryLevel.builder().warehouseId(DEFAULT_WAREHOUSE_ID).warehouseName(DEFAULT_WAREHOUSE_NAME).onHandQuantity(0).reservedQuantity(0).soldQuantity(0).build();
    }

    private ProductVariant findVariant(List<ProductVariant> variants, String variantId) {
        if (variants == null || variantId == null) {
            return null;
        }
        return variants.stream().filter(variant -> variantId.equals(variant.getId())).findFirst().orElse(null);
    }

    private String generateVariantSku(String productSlug, int index) {
        String base = hasText(productSlug) ? productSlug : "product";
        return (base + "-v" + index).toUpperCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private int nonNegative(Integer value) {
        return value == null ? 0 : Math.max(0, value);
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
        Set<String> brandIds = products.stream().map(Product::getBrandId).filter(id -> id != null && !id.isBlank()).collect(Collectors.toSet());
        Set<String> categoryIds = products.stream().map(Product::getCategoryId).filter(id -> id != null && !id.isBlank()).collect(Collectors.toSet());
        var brandNameMap = brandRepository.findAllById(brandIds).stream().collect(Collectors.toMap(Brand::getId, Brand::getName));
        var categoryNameMap = categoryRepository.findAllById(categoryIds).stream().collect(Collectors.toMap(Category::getId, Category::getName));
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
        return brandRepository.findByIdAndIsActiveTrue(brandId).map(Brand::getName).orElseThrow(() -> new ResourceNotFoundException("Brand", "active id", brandId));
    }

    private String resolveCategoryName(String categoryId) {
        return categoryRepository.findByIdAndIsActiveTrue(categoryId).map(Category::getName).orElseThrow(() -> new ResourceNotFoundException("Category", "active id", categoryId));
    }

    private ProductResponse toResponse(Product product) {
        return ProductResponse.builder().id(product.getId()).name(product.getName()).slug(product.getSlug()).description(product.getDescription()).price(product.getPrice()).imageUrl(product.getImageUrl()).images(product.getImages()).brandId(product.getBrandId()).brandName(product.getBrandName()).categoryId(product.getCategoryId()).categoryName(product.getCategoryName()).targetConcerns(product.getTargetConcerns()).targetSkinTypes(product.getTargetSkinTypes()).keyIngredientIds(product.getKeyIngredientIds()).ingredients(mapIngredientResponses(product.getIngredients())).variants(mapVariantResponses(product)).totalOnHandQuantity(totalOnHand(product)).totalReservedQuantity(totalReserved(product)).totalAvailableQuantity(totalAvailable(product)).hasLowStock(hasLowStock(product)).isActive(product.getIsActive()).createdAt(product.getCreatedAt()).updatedAt(product.getUpdatedAt()).build();
    }

    private ProductSummaryResponse toSummaryResponse(Product product) {
        return ProductSummaryResponse.builder().id(product.getId()).name(product.getName()).slug(product.getSlug()).price(product.getPrice()).imageUrl(product.getImageUrl()).brandId(product.getBrandId()).brandName(product.getBrandName()).categoryId(product.getCategoryId()).categoryName(product.getCategoryName()).isActive(product.getIsActive()).targetConcerns(product.getTargetConcerns()).targetSkinTypes(product.getTargetSkinTypes()).keyIngredientIds(product.getKeyIngredientIds()).variantCount(variantCount(product)).totalOnHandQuantity(totalOnHand(product)).totalReservedQuantity(totalReserved(product)).totalAvailableQuantity(totalAvailable(product)).hasLowStock(hasLowStock(product)).createdAt(product.getCreatedAt()).updatedAt(product.getUpdatedAt()).build();
    }

    private List<ProductIngredientResponse> mapIngredientResponses(List<ProductIngredient> ingredients) {
        if (ingredients == null)
            return Collections.emptyList();
        return ingredients.stream().map(i -> ProductIngredientResponse.builder().ingredientId(i.getIngredientId()).name(i.getName()).percentage(i.getPercentage()).isKey(i.getIsKey()).concerns(i.getConcerns()).build()).toList();
    }

    private List<ProductVariantResponse> mapVariantResponses(Product product) {
        List<ProductVariant> variants = product.getVariants();
        if (variants == null || variants.isEmpty()) {
            variants = List.of(legacyVariant(product));
        }
        return variants.stream().map(this::toVariantResponse).toList();
    }

    private ProductVariant legacyVariant(Product product) {
        return ProductVariant.builder().id("legacy-default").name("Default").sku((product.getSlug() != null ? product.getSlug() : product.getId()) + "-default").price(product.getPrice()).imageUrl(product.getImageUrl()).isActive(product.getIsActive()).trackInventory(true).lowStockThreshold(5).inventoryLevels(Collections.emptyList()).build();
    }

    private ProductVariantResponse toVariantResponse(ProductVariant variant) {
        List<InventoryLevelResponse> levels = mapInventoryLevelResponses(variant.getInventoryLevels());
        int onHand = levels.stream().mapToInt(InventoryLevelResponse::getOnHandQuantity).sum();
        int reserved = levels.stream().mapToInt(InventoryLevelResponse::getReservedQuantity).sum();
        int available = levels.stream().mapToInt(InventoryLevelResponse::getAvailableQuantity).sum();
        int sold = levels.stream().mapToInt(InventoryLevelResponse::getSoldQuantity).sum();
        boolean lowStock = Boolean.TRUE.equals(variant.getTrackInventory()) && Boolean.TRUE.equals(variant.getIsActive()) && available <= nonNegative(variant.getLowStockThreshold());
        return ProductVariantResponse.builder().id(variant.getId()).name(variant.getName()).sku(variant.getSku()).price(variant.getPrice()).imageUrl(variant.getImageUrl()).volume(variant.getVolume()).unit(variant.getUnit()).isActive(variant.getIsActive()).trackInventory(variant.getTrackInventory()).lowStockThreshold(variant.getLowStockThreshold()).onHandQuantity(onHand).reservedQuantity(reserved).availableQuantity(available).soldQuantity(sold).lowStock(lowStock).inventoryLevels(levels).build();
    }

    private List<InventoryLevelResponse> mapInventoryLevelResponses(List<InventoryLevel> levels) {
        if (levels == null) {
            return Collections.emptyList();
        }
        return levels.stream().filter(Objects::nonNull).map(level -> {
            int onHand = nonNegative(level.getOnHandQuantity());
            int reserved = nonNegative(level.getReservedQuantity());
            int available = Math.max(0, onHand - reserved);
            return InventoryLevelResponse.builder().warehouseId(level.getWarehouseId()).warehouseName(level.getWarehouseName()).onHandQuantity(onHand).reservedQuantity(reserved).availableQuantity(available).soldQuantity(nonNegative(level.getSoldQuantity())).build();
        }).toList();
    }

    private int variantCount(Product product) {
        return product.getVariants() == null || product.getVariants().isEmpty() ? 1 : product.getVariants().size();
    }

    private int totalOnHand(Product product) {
        return mapVariantResponses(product).stream().mapToInt(ProductVariantResponse::getOnHandQuantity).sum();
    }

    private int totalReserved(Product product) {
        return mapVariantResponses(product).stream().mapToInt(ProductVariantResponse::getReservedQuantity).sum();
    }

    private int totalAvailable(Product product) {
        return mapVariantResponses(product).stream().mapToInt(ProductVariantResponse::getAvailableQuantity).sum();
    }

    private boolean hasLowStock(Product product) {
        return mapVariantResponses(product).stream().anyMatch(response -> Boolean.TRUE.equals(response.getLowStock()));
    }
}
