// Project: SkinGuide - MSS301
// Service Component

package mss.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import mss.orderservice.model.Voucher.DiscountType;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Payload tạo/sửa voucher (admin). Không cho client set id/usedCount/createdAt trực tiếp.
 */
@Data
public class VoucherRequest {
    @NotBlank(message = "Mã voucher là bắt buộc")
    private String code;

    @NotNull(message = "Loại giảm giá là bắt buộc")
    private DiscountType discountType;

    @NotNull(message = "Giá trị giảm giá là bắt buộc")
    @Positive(message = "Giá trị giảm giá phải lớn hơn 0")
    private BigDecimal discountValue;

    private BigDecimal minOrderAmount;

    private BigDecimal maxDiscountAmount;

    private Integer usageLimit;

    private Instant expiresAt;

    private Boolean isActive;
}
