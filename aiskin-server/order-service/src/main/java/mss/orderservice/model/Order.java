// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "orders")
@CompoundIndex(
        name = "customer_idempotency_unique",
        def = "{'customerId': 1, 'idempotencyKey': 1}",
        unique = true,
        partialFilter = "{'idempotencyKey': {'$type': 'string'}}")
public class Order {

    @Id
    private String id;

    @Indexed(unique = true)
    private String orderCode; // E.g., ORD-123456
    private String idempotencyKey;

    // Customer Info
    private String customerId; // Can be null if guest, or match user-service ID
    private String customerName;
    private String customerPhone;
    private String shippingAddress;
    private Integer ghnDistrictId;
    private String ghnWardCode;
    private String customerNote; // Ghi chú của khách hàng

    // Items & Pricing
    private List<OrderItem> items;
    private BigDecimal totalAmount;
    private BigDecimal shippingFee;

    // Shipping
    private String trackingCode; // Mã vận đơn GHN

    // Status
    private OrderStatus status;
    private PaymentMethod paymentMethod; // COD, MOMO, VNPAY
    private PaymentStatus paymentStatus; // UNPAID, PAID, FAILED, REFUNDED
    private String paymentTransactionId;
    private LocalDateTime paidAt;

    private String cancelReason;

    @Builder.Default
    private Boolean inventoryReserved = false;

    @Builder.Default
    private Boolean inventoryCommitted = false;

    private LocalDateTime reservationExpiresAt;

    // Timestamps
    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Status History
    private List<OrderStatusHistory> statusHistory;

    public void addStatusHistory(OrderStatus newStatus, String note) {
        if (this.statusHistory == null) {
            this.statusHistory = new ArrayList<>();
        }

        String newGroup = getStatusGroup(newStatus);

        if (!this.statusHistory.isEmpty()) {
            OrderStatusHistory lastHistory = this.statusHistory.get(this.statusHistory.size() - 1);
            String lastGroup = getStatusGroup(lastHistory.getStatus());

            // Nếu cùng một nhóm trạng thái chính thì không tạo thêm lịch sử mới
            // Chỉ cập nhật trạng thái thực tế của đơn hàng (để theo dõi GHN)
            if (lastGroup.equals(newGroup)) {
                this.setStatus(newStatus);
                return;
            }
        }

        OrderStatusHistory history = new OrderStatusHistory();
        history.setStatus(newStatus);
        history.setNote(note);
        history.setCreatedAt(LocalDateTime.now());

        this.statusHistory.add(history);
        this.setStatus(newStatus); // Tự động cập nhật field status chính
    }

    private String getStatusGroup(OrderStatus status) {
        if (status == null) return "";
        switch (status) {
            case PENDING: return "PENDING";
            case PROCESSING: return "PROCESSING";
            case READY_TO_PICK:
            case PICKING:
            case PICKED:
            case STORING:
            case SORTING:
            case TRANSPORTING:
            case DELIVERING:
            case DELIVERY_FAIL:
                return "DELIVERING";
            case DELIVERED:
            case RECEIVED:
                return "DELIVERED";
            case WAITING_TO_RETURN:
            case RETURN:
            case RETURN_TRANSPORTING:
            case RETURNING:
            case RETURN_FAIL:
            case REFUSED:
                return "REFUSED";
            case RETURNED:
                return "RETURNED";
            case CANCELLED:
                return "CANCELLED";
            default: return status.name();
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderStatusHistory {
        private OrderStatus status;
        private String note;
        private LocalDateTime createdAt;
    }

    public enum OrderStatus {
        PENDING, PROCESSING,
        READY_TO_PICK, PICKING, PICKED, STORING,
        SORTING, TRANSPORTING, DELIVERING, DELIVERED,
        DELIVERY_FAIL, WAITING_TO_RETURN, RETURN, RETURN_TRANSPORTING, RETURNING, RETURN_FAIL, RETURNED,
        RECEIVED, REFUSED, CANCELLED
    }

    public enum PaymentMethod {
        COD, MOMO, VNPAY, BANK_TRANSFER
    }

    public enum PaymentStatus {
        UNPAID, PAID, FAILED, REFUNDED
    }
}
