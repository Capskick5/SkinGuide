// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "product_reviews")
@CompoundIndex(name = "customer_product_unique", def = "{'customerId': 1, 'productId': 1}", unique = true)
public class ProductReview {

    @Id
    private String id;
    private String productId;
    private String orderId;
    private String orderCode;
    private String customerId;
    private String reviewerName;
    private Integer rating;
    private String comment;
    private Boolean verifiedPurchase;
    private Instant createdAt;
    private Instant updatedAt;
}
