package mss.productservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.ProductRequest;
import mss.productservice.dto.response.ApiResponse;
import mss.productservice.dto.response.ProductResponse;
import mss.productservice.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.ok(productService.getAllProducts()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getActiveProducts() {
        return ResponseEntity.ok(ApiResponse.ok(productService.getActiveProducts()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductById(id)));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductBySlug(slug)));
    }

    @GetMapping("/brand/{brandId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByBrand(@PathVariable String brandId) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByBrand(brandId)));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByCategory(@PathVariable String categoryId) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByCategory(categoryId)));
    }

    @GetMapping("/skin-type")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsBySkinType(@RequestParam String type) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsBySkinType(type)));
    }

    @GetMapping("/concern")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByConcern(@RequestParam String concern) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByConcern(concern)));
    }

    @GetMapping("/ingredient/{ingredientId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByIngredient(@PathVariable String ingredientId) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getProductsByIngredient(ingredientId)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> searchProducts(@RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(productService.searchProducts(keyword)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(@Valid @RequestBody ProductRequest request) {
        ProductResponse created = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Product created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(@PathVariable String id,
                                                                       @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Product updated", productService.updateProduct(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable String id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.ok("Product deleted", null));
    }
}
