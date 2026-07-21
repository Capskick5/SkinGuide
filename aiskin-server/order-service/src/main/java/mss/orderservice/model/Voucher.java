// Project: SkinGuide - MSS301
// Service Component

package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Mã giảm giá áp dụng khi đặt hàng.
 * Discount PERCENT tính theo % subtotal (có thể bị chặn bởi maxDiscountAmount),
 * Discount FIXED là số tiền cố định. Cả hai đều không được vượt quá subtotal.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "vouchers")
public class Voucher {

    @Id
    private String id;

    @Indexed(unique = true)
    private String code;

    private DiscountType discountType;

    private BigDecimal discountValue;

    // Đơn hàng phải đạt tối thiểu số tiền này (tính trên subtotal hàng, không tính ship) mới được áp dụng. Null = không giới hạn.
    private BigDecimal minOrderAmount;

    // Trần giảm giá tối đa khi discountType = PERCENT. Null = không giới hạn.
    private BigDecimal maxDiscountAmount;

    // Tổng số lượt được sử dụng. Null = không giới hạn.
    private Integer usageLimit;

    @Builder.Default
    private int usedCount = 0;

    private Instant expiresAt;

    @Builder.Default
    private boolean isActive = true;

    @CreatedDate
    private Instant createdAt;

    public enum DiscountType {
        PERCENT, FIXED
    }
}
