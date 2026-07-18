package mss.orderservice.service.impl;

import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.ProductReviewEligibilityResponse;
import mss.orderservice.dto.ProductReviewRequest;
import mss.orderservice.dto.ProductReviewResponse;
import mss.orderservice.dto.ProductReviewSummaryResponse;
import mss.orderservice.model.Order;
import mss.orderservice.model.ProductReview;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ProductReviewRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import mss.orderservice.service.*;

@Service
@RequiredArgsConstructor
public class ProductReviewService implements IProductReviewService {

    private final ProductReviewRepository reviewRepository;

    private final OrderRepository orderRepository;

    public ProductReviewSummaryResponse getProductReviews(String productId, int page, int size) {
        Page<ProductReview> reviewPage = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId, PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 50)));
        List<ProductReview> allReviews = reviewRepository.findByProductId(productId);
        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        for (int rating = 5; rating >= 1; rating--) {
            int expected = rating;
            breakdown.put(rating, allReviews.stream().filter(review -> review.getRating() == expected).count());
        }
        double average = allReviews.stream().mapToInt(ProductReview::getRating).average().orElse(0.0);
        return ProductReviewSummaryResponse.builder().productId(productId).averageRating(Math.round(average * 10.0) / 10.0).totalReviews(allReviews.size()).ratingBreakdown(breakdown).reviews(reviewPage.getContent().stream().map(this::toResponse).toList()).page(reviewPage.getNumber()).totalPages(reviewPage.getTotalPages()).build();
    }

    public ProductReviewEligibilityResponse getEligibility(String customerId, String productId) {
        ProductReview existing = reviewRepository.findByCustomerIdAndProductId(customerId, productId).orElse(null);
        if (existing != null) {
            return ProductReviewEligibilityResponse.builder().eligible(true).reason("Bạn đã đánh giá sản phẩm này và có thể cập nhật đánh giá.").existingReview(toResponse(existing)).build();
        }
        boolean purchased = findDeliveredOrder(customerId, productId) != null;
        return ProductReviewEligibilityResponse.builder().eligible(purchased).reason(purchased ? "Đơn hàng đã giao thành công. Bạn có thể đánh giá sản phẩm." : "Chỉ khách đã nhận sản phẩm mới có thể đánh giá.").build();
    }

    public ProductReviewResponse create(String customerId, String productId, ProductReviewRequest request) {
        if (reviewRepository.findByCustomerIdAndProductId(customerId, productId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã đánh giá sản phẩm này");
        }
        Order order = findDeliveredOrder(customerId, productId);
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ khách đã nhận sản phẩm mới có thể đánh giá");
        }
        Instant now = Instant.now();
        ProductReview review = ProductReview.builder().productId(productId).orderId(order.getId()).orderCode(order.getOrderCode()).customerId(customerId).reviewerName(maskName(order.getCustomerName())).rating(request.getRating()).comment(request.getComment().trim()).verifiedPurchase(true).createdAt(now).updatedAt(now).build();
        return toResponse(reviewRepository.save(review));
    }

    public ProductReviewResponse update(String customerId, String reviewId, ProductReviewRequest request) {
        ProductReview review = ownedReview(customerId, reviewId);
        review.setRating(request.getRating());
        review.setComment(request.getComment().trim());
        review.setUpdatedAt(Instant.now());
        return toResponse(reviewRepository.save(review));
    }

    public void delete(String customerId, String reviewId) {
        reviewRepository.delete(ownedReview(customerId, reviewId));
    }

    private ProductReview ownedReview(String customerId, String reviewId) {
        ProductReview review = reviewRepository.findById(reviewId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá"));
        if (!customerId.equals(review.getCustomerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa đánh giá này");
        }
        return review;
    }

    private Order findDeliveredOrder(String customerId, String productId) {
        Page<Order> deliveredOrders = orderRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, Order.OrderStatus.DELIVERED, PageRequest.of(0, 100));
        return deliveredOrders.stream().filter(order -> order.getItems() != null && order.getItems().stream().anyMatch(item -> productId.equals(item.getProductId()))).findFirst().orElse(null);
    }

    private ProductReviewResponse toResponse(ProductReview review) {
        return ProductReviewResponse.builder().id(review.getId()).productId(review.getProductId()).reviewerName(review.getReviewerName()).rating(review.getRating()).comment(review.getComment()).verifiedPurchase(review.getVerifiedPurchase()).createdAt(review.getCreatedAt()).updatedAt(review.getUpdatedAt()).build();
    }

    private String maskName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "Khách hàng";
        }
        String firstPart = fullName.trim().split("\\s+")[0];
        return firstPart + " ***";
    }
}
