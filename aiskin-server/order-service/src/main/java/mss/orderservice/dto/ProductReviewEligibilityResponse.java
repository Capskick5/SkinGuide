package mss.orderservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductReviewEligibilityResponse {
    private boolean eligible;
    private String reason;
    private ProductReviewResponse existingReview;
}
