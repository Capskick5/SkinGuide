package mss.orderservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ProductReviewResponse {
    private String id;
    private String productId;
    private String reviewerName;
    private Integer rating;
    private String comment;
    private Boolean verifiedPurchase;
    private Instant createdAt;
    private Instant updatedAt;
}
