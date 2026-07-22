package mss.productservice.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class FlashDealResponse {
    private ProductSummaryResponse product;
    private int discountPercent;
    private double originalPrice;
    private double dealPrice;
    private Instant startsAt;
    private Instant endsAt;
}
