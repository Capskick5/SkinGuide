package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "orders")
public class Order {

    @Id
    private String id;
    
    private String orderCode; // E.g., ORD-123456
    
    // Customer Info
    private String customerId; // Can be null if guest, or match user-service ID
    private String customerName;
    private String customerPhone;
    private String shippingAddress;
    private Integer ghnDistrictId;
    private String ghnWardCode;
    
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
    
    private String cancelReason;

    // Timestamps
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    public enum OrderStatus {
        PENDING, PROCESSING, READY_TO_SHIP, DELIVERING, DELIVERED, RECEIVED, REFUSED, DELIVERY_FAILED, RETURNED, CANCELLED
    }
    
    public enum PaymentMethod {
        COD, MOMO, VNPAY
    }
    
    public enum PaymentStatus {
        UNPAID, PAID, FAILED, REFUNDED
    }
}
