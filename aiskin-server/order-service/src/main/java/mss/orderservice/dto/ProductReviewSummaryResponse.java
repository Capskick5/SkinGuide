package mss.orderservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class ProductReviewSummaryResponse {
    private String productId;
    private double averageRating;
    private long totalReviews;
    private Map<Integer, Long> ratingBreakdown;
    private List<ProductReviewResponse> reviews;
    private int page;
    private int totalPages;
}
