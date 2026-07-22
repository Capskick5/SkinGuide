// Project: SkinGuide - MSS301
// Service Component

package mss.orderservice.service.impl;

import lombok.extern.slf4j.Slf4j;
import com.mongodb.client.result.UpdateResult;
import mss.orderservice.dto.VoucherRequest;
import mss.orderservice.model.Voucher;
import mss.orderservice.repository.VoucherRepository;
import mss.orderservice.service.IVoucherService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.MongoExpression;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Slf4j
@Service
public class VoucherService implements IVoucherService {

    private static final int MAX_PAGE_SIZE = 100;

    private final VoucherRepository voucherRepository;
    private final MongoTemplate mongoTemplate;

    public VoucherService(VoucherRepository voucherRepository, MongoTemplate mongoTemplate) {
        this.voucherRepository = voucherRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public BigDecimal validateAndCalculateDiscount(String code, BigDecimal orderSubtotal) {
        if (code == null || code.isBlank()) {
            return BigDecimal.ZERO;
        }
        BigDecimal subtotal = orderSubtotal != null ? orderSubtotal : BigDecimal.ZERO;
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code.trim()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá không tồn tại"));
        if (!voucher.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã ngưng hoạt động");
        }
        if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã hết hạn");
        }
        if (voucher.getUsageLimit() != null && voucher.getUsedCount() >= voucher.getUsageLimit()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã hết lượt sử dụng");
        }
        if (voucher.getMinOrderAmount() != null && subtotal.compareTo(voucher.getMinOrderAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng cần đạt tối thiểu " + voucher.getMinOrderAmount() + "đ để áp dụng mã này");
        }
        BigDecimal discount;
        if (voucher.getDiscountType() == Voucher.DiscountType.PERCENT) {
            discount = subtotal.multiply(voucher.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscountAmount() != null && discount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                discount = voucher.getMaxDiscountAmount();
            }
        } else {
            discount = voucher.getDiscountValue();
        }
        if (discount.compareTo(subtotal) > 0) {
            discount = subtotal;
        }
        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            discount = BigDecimal.ZERO;
        }
        return discount;
    }

    @Override
    public void incrementUsage(String code) {
        if (code == null || code.isBlank()) {
            return;
        }
        String normalizedCode = code.trim();
        Criteria remainingUsage = new Criteria().orOperator(
                Criteria.where("usageLimit").is(null),
                Criteria.expr(MongoExpression.create(
                        "{ $lt: [ { $ifNull: [ '$usedCount', 0 ] }, '$usageLimit' ] }")));
        Query query = Query.query(new Criteria().andOperator(
                Criteria.where("code").regex("^" + java.util.regex.Pattern.quote(normalizedCode) + "$", "i"),
                Criteria.where("isActive").is(true),
                new Criteria().orOperator(
                        Criteria.where("expiresAt").is(null),
                        Criteria.where("expiresAt").gt(Instant.now())),
                remainingUsage));

        UpdateResult result = mongoTemplate.updateFirst(
                query,
                new Update().inc("usedCount", 1),
                Voucher.class);
        if (result.getModifiedCount() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Mã giảm giá không còn hợp lệ hoặc đã hết lượt sử dụng");
        }
    }

    @Override
    public void releaseUsage(String code) {
        if (code == null || code.isBlank()) {
            return;
        }
        Query query = Query.query(new Criteria().andOperator(
                Criteria.where("code").regex(
                        "^" + java.util.regex.Pattern.quote(code.trim()) + "$", "i"),
                Criteria.where("usedCount").gt(0)));
        mongoTemplate.updateFirst(query, new Update().inc("usedCount", -1), Voucher.class);
    }

    @Override
    public Voucher create(VoucherRequest request) {
        String code = normalizeCode(request.getCode());
        validateDiscountShape(request);
        voucherRepository.findByCodeIgnoreCase(code).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã tồn tại");
        });
        Voucher voucher = Voucher.builder().code(code).discountType(request.getDiscountType()).discountValue(request.getDiscountValue()).minOrderAmount(request.getMinOrderAmount()).maxDiscountAmount(request.getMaxDiscountAmount()).usageLimit(request.getUsageLimit()).usedCount(0).expiresAt(request.getExpiresAt()).isActive(request.getIsActive() == null || request.getIsActive()).createdAt(Instant.now()).build();
        return voucherRepository.save(voucher);
    }

    @Override
    public Voucher update(String id, VoucherRequest request) {
        Voucher voucher = voucherRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy voucher"));
        validateDiscountShape(request);
        String newCode = normalizeCode(request.getCode());
        if (!newCode.equals(voucher.getCode())) {
            voucherRepository.findByCodeIgnoreCase(newCode).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã tồn tại");
                }
            });
        }
        voucher.setCode(newCode);
        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMinOrderAmount(request.getMinOrderAmount());
        voucher.setMaxDiscountAmount(request.getMaxDiscountAmount());
        voucher.setUsageLimit(request.getUsageLimit());
        voucher.setExpiresAt(request.getExpiresAt());
        if (request.getIsActive() != null) {
            voucher.setActive(request.getIsActive());
        }
        return voucherRepository.save(voucher);
    }

    @Override
    public Page<Voucher> list(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), MAX_PAGE_SIZE);
        return voucherRepository.findAll(PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @Override
    public void delete(String id) {
        // Deactivate thay vì xóa cứng để giữ toàn vẹn dữ liệu cho các đơn hàng đã dùng voucher này.
        Voucher voucher = voucherRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy voucher"));
        voucher.setActive(false);
        voucherRepository.save(voucher);
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá là bắt buộc");
        }
        return code.trim().toUpperCase();
    }

    private void validateDiscountShape(VoucherRequest request) {
        if (request.getDiscountType() == Voucher.DiscountType.PERCENT && request.getDiscountValue() != null && request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị giảm theo % không được vượt quá 100");
        }
    }
}
