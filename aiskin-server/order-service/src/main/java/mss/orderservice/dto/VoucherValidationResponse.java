// Project: SkinGuide - MSS301
// Service Component

package mss.orderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Kết quả xem trước (preview) khi khách nhập mã giảm giá — không ghi vào DB.
 */
@Data
@Builder
@AllArgsConstructor
public class VoucherValidationResponse {
    private String code;
    private BigDecimal discountAmount;
}
