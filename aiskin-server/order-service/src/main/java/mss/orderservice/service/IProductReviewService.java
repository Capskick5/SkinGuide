package mss.orderservice.service;

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

public interface IProductReviewService {

    ProductReviewSummaryResponse getProductReviews(String productId, int page, int size);

    ProductReviewEligibilityResponse getEligibility(String customerId, String productId);

    ProductReviewResponse create(String customerId, String productId, ProductReviewRequest request);

    ProductReviewResponse update(String customerId, String reviewId, ProductReviewRequest request);

    void delete(String customerId, String reviewId);
}
