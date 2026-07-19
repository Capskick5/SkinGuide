// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.BrandRequest;
import mss.productservice.dto.response.ApiResponse;
import mss.productservice.dto.response.BrandResponse;
import mss.productservice.service.impl.BrandService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import mss.productservice.service.IBrandService;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {

    private final IBrandService brandService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getAllBrands() {
        return ResponseEntity.ok(ApiResponse.ok(brandService.getAllBrands()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getActiveBrands() {
        return ResponseEntity.ok(ApiResponse.ok(brandService.getActiveBrands()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandResponse>> getBrandById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(brandService.getBrandById(id)));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<BrandResponse>> getBrandBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(brandService.getBrandBySlug(slug)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<BrandResponse>>> searchBrands(@RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(brandService.searchBrands(keyword)));
    }

    @PostMapping
    @PreAuthorize("hasPermission('/api/brands', 'POST')")
    public ResponseEntity<ApiResponse<BrandResponse>> createBrand(@Valid @RequestBody BrandRequest request) {
        BrandResponse created = brandService.createBrand(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Brand created", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasPermission('/api/brands/{id}', 'PUT')")
    public ResponseEntity<ApiResponse<BrandResponse>> updateBrand(@PathVariable String id, @Valid @RequestBody BrandRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Brand updated", brandService.updateBrand(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasPermission('/api/brands/{id}', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteBrand(@PathVariable String id) {
        brandService.deleteBrand(id);
        return ResponseEntity.ok(ApiResponse.ok("Brand deleted", null));
    }
}
