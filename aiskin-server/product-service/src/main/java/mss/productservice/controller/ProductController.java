package mss.productservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.ProductRequest;
import mss.productservice.dto.response.ApiResponse;
import mss.productservice.dto.response.ProductResponse;
import mss.productservice.dto.response.ProductSummaryResponse;
import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping("/internal/sync-kafka")
    public ResponseEntity<ApiResponse<String>> syncKafka() {
        productService.syncAllProductsToKafka();
        return ResponseEntity.ok(ApiResponse.ok("Products synced to Kafka successfully", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getAllProducts(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProducts(canManageCatalog(authentication))));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getActiveProducts() {
        return ResponseEntity.ok(ApiResponse.ok(productService.getActiveProducts()));
    }

    @GetMapping("/search/advanced")
    public ResponseEntity<ApiResponse<Page<ProductSummaryResponse>>> searchAdvanced(
            @ModelAttribute ProductSearchRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                productService.searchAdvanced(request, canManageCatalog(authentication))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(
            @PathVariable String id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                productService.getProductById(id, canManageCatalog(authentication))));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductBySlug(
            @PathVariable String slug,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                productService.getProductBySlug(slug, canManageCatalog(authentication))));
    }

    @GetMapping("/brand/{brandId}")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getProductsByBrand(@PathVariable String brandId) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByBrand(brandId)));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getProductsByCategory(@PathVariable String categoryId) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByCategory(categoryId)));
    }

    @GetMapping("/skin-type")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getProductsBySkinType(@RequestParam String type) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsBySkinType(type)));
    }

    @GetMapping("/concern")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getProductsByConcern(@RequestParam String concern) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByConcern(concern)));
    }

    @GetMapping("/ingredient/{ingredientId}")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getProductsByIngredient(@PathVariable String ingredientId) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByIngredient(ingredientId)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> searchProducts(@RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(productService.searchProducts(keyword)));
    }

    @PostMapping
    @PreAuthorize("hasPermission('/api/products', 'POST')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(@Valid @RequestBody ProductRequest request) {
        ProductResponse created = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Product created", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasPermission('/api/products/{id}', 'PUT')")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(@PathVariable String id,
                                                                       @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Product updated", productService.updateProduct(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasPermission('/api/products/{id}', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable String id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.ok("Product deleted", null));
    }

    private boolean canManageCatalog(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(authority -> authority.equals("ROLE_ADMIN")
                        || authority.equals("ROLE_MANAGER")
                        || authority.equals("POST:/api/products")
                        || authority.equals("ANY:/api/products"));
    }
}
