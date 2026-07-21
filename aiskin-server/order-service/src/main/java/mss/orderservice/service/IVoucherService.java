// Project: SkinGuide - MSS301
// Service Component

package mss.orderservice.service;

import mss.orderservice.dto.VoucherRequest;
import mss.orderservice.model.Voucher;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;

public interface IVoucherService {

    /**
     * Kiểm tra mã giảm giá và tính số tiền được giảm dựa trên subtotal (không tính phí ship).
     * Trả về 0 nếu code null/blank. Ném ResponseStatusException(BAD_REQUEST) nếu mã không hợp lệ,
     * hết hạn, ngưng hoạt động, hết lượt dùng, hoặc subtotal chưa đạt mức tối thiểu.
     * Không ghi nhận lượt dùng (chỉ preview) — dùng incrementUsage() riêng khi tạo đơn thành công.
     */
    BigDecimal validateAndCalculateDiscount(String code, BigDecimal orderSubtotal);

    /** Tăng usedCount của voucher. Gọi sau khi đơn hàng dùng voucher được lưu thành công. */
    void incrementUsage(String code);

    /** Giảm usedCount của voucher (không cho âm). Gọi khi đơn hàng dùng voucher đó bị hủy. */
    void releaseUsage(String code);

    Voucher create(VoucherRequest request);

    Voucher update(String id, VoucherRequest request);

    Page<Voucher> list(int page, int size);

    void delete(String id);
}
