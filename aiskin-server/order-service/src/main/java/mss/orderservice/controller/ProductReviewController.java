package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.ProductReviewEligibilityResponse;
import mss.orderservice.dto.ProductReviewRequest;
import mss.orderservice.dto.ProductReviewResponse;
import mss.orderservice.dto.ProductReviewSummaryResponse;
import mss.orderservice.service.ProductReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/reviews")
@Tag(name = "Product Reviews", description = "Verified-purchase product reviews")
@RequiredArgsConstructor
public class ProductReviewController {

    private final ProductReviewService reviewService;

    @GetMapping("/product/{productId}")
    @Operation(summary = "List product reviews and rating summary")
    public ProductReviewSummaryResponse getProductReviews(
            @PathVariable String productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return reviewService.getProductReviews(productId, page, size);
    }

    @GetMapping("/product/{productId}/me")
    @Operation(summary = "Check whether the current customer can review a product")
    public ProductReviewEligibilityResponse getEligibility(
            @PathVariable String productId,
            Authentication authentication) {
        return reviewService.getEligibility(authentication.getName(), productId);
    }

    @PostMapping("/product/{productId}")
    @Operation(summary = "Create a verified-purchase review")
    public ProductReviewResponse createReview(
            @PathVariable String productId,
            @Valid @RequestBody ProductReviewRequest request,
            Authentication authentication) {
        return reviewService.create(authentication.getName(), productId, request);
    }

    @PutMapping("/{reviewId}")
    @Operation(summary = "Update the current customer's review")
    public ProductReviewResponse updateReview(
            @PathVariable String reviewId,
            @Valid @RequestBody ProductReviewRequest request,
            Authentication authentication) {
        return reviewService.update(authentication.getName(), reviewId, request);
    }

    @DeleteMapping("/{reviewId}")
    @Operation(summary = "Delete the current customer's review")
    public ResponseEntity<Void> deleteReview(
            @PathVariable String reviewId,
            Authentication authentication) {
        reviewService.delete(authentication.getName(), reviewId);
        return ResponseEntity.noContent().build();
    }
}
