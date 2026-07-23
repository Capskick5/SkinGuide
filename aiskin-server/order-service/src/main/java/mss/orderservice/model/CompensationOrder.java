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
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "compensation_orders")
public class CompensationOrder {

    @Id
    private String id;

    // Liên kết đến đơn khiếu nại gốc
    @Indexed(unique = true)
    private String returnOrderId;
    private String orderId;
    private String orderCode;

    private String customerId;
    private String customerName;

    // Lý do tạo đơn bù
    private CompensationType type; // REDELIVER (giao lại) từ case giao thiếu/sai

    // Danh sách hàng cần giao bù cho khách
    private List<CompensationItem> items;

    // Ghi chú từ admin
    private String note;

    // Trạng thái xử lý bởi kho
    private CompensationStatus status;

    private String courier;
    private String trackingCode;
    private BigDecimal shippingFee;

    @Builder.Default
    private Boolean inventoryReserved = false;

    @Builder.Default
    private Boolean inventoryCommitted = false;

    private String failureReason;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum CompensationType {
        REDELIVER_MISSING,  // Giao bù hàng còn thiếu (case giao thiếu)
        REDELIVER_CORRECT   // Giao lại hàng đúng (case giao sai)
    }

    public enum CompensationStatus {
        PENDING,
        INVENTORY_RESERVED,
        READY_TO_SHIP,
        SHIPPING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CompensationItem {
        private String productId;
        private String variantId;
        private String sku;
        private String variantName;
        private String productName;
        private String imageUrl;
        private Integer quantity;
        private String unit;
        private BigDecimal unitPrice;
    }
}
