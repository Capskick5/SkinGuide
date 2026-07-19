// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Document(collection = "refund_requests")
public class RefundRequest {
    @Id
    private String id;
    @Indexed(unique = true)
    private String returnOrderId;
    private String orderId;
    private String orderCode;
    private String customerId;
    private String customerName;

    private BigDecimal amount;

    // Bank Information
    private String bankName;
    private String accountNumber;
    private String accountName;

    private String receiptUrl; // Proof of transfer

    private RefundStatus status = RefundStatus.PENDING;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum RefundStatus {
        PENDING,
        COMPLETED,
        REJECTED
    }
}
