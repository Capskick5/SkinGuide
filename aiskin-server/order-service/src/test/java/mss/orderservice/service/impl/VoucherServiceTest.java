package mss.orderservice.service.impl;

import com.mongodb.client.result.UpdateResult;
import mss.orderservice.model.Voucher;
import mss.orderservice.repository.VoucherRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VoucherServiceTest {

    private final VoucherRepository repository = mock(VoucherRepository.class);
    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final VoucherService service = new VoucherService(repository, mongoTemplate);

    @Test
    void blankCodeReturnsZeroDiscountWithoutTouchingRepository() {
        assertThat(service.validateAndCalculateDiscount(null, BigDecimal.valueOf(100_000))).isEqualByComparingTo("0");
        assertThat(service.validateAndCalculateDiscount("  ", BigDecimal.valueOf(100_000))).isEqualByComparingTo("0");
    }

    @Test
    void percentDiscountIsCappedByMaxDiscountAmount() {
        Voucher voucher = Voucher.builder().code("SALE20").discountType(Voucher.DiscountType.PERCENT).discountValue(BigDecimal.valueOf(20)).maxDiscountAmount(BigDecimal.valueOf(15_000)).isActive(true).build();
        when(repository.findByCodeIgnoreCase("SALE20")).thenReturn(Optional.of(voucher));

        // 20% của 200,000 = 40,000 nhưng bị chặn trần 15,000
        BigDecimal discount = service.validateAndCalculateDiscount("SALE20", BigDecimal.valueOf(200_000));

        assertThat(discount).isEqualByComparingTo("15000");
    }

    @Test
    void percentDiscountWithoutCapAppliesFullPercentage() {
        Voucher voucher = Voucher.builder().code("SALE10").discountType(Voucher.DiscountType.PERCENT).discountValue(BigDecimal.valueOf(10)).isActive(true).build();
        when(repository.findByCodeIgnoreCase("SALE10")).thenReturn(Optional.of(voucher));

        BigDecimal discount = service.validateAndCalculateDiscount("SALE10", BigDecimal.valueOf(200_000));

        assertThat(discount).isEqualByComparingTo("20000");
    }

    @Test
    void fixedDiscountNeverExceedsSubtotal() {
        Voucher voucher = Voucher.builder().code("FIX50K").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(50_000)).isActive(true).build();
        when(repository.findByCodeIgnoreCase("FIX50K")).thenReturn(Optional.of(voucher));

        // Subtotal chỉ 30,000 nên discount phải bị giới hạn lại còn 30,000, không được âm tiền đơn hàng
        BigDecimal discount = service.validateAndCalculateDiscount("FIX50K", BigDecimal.valueOf(30_000));

        assertThat(discount).isEqualByComparingTo("30000");
    }

    @Test
    void expiredVoucherIsRejected() {
        Voucher voucher = Voucher.builder().code("OLD10").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(true).expiresAt(Instant.now().minusSeconds(60)).build();
        when(repository.findByCodeIgnoreCase("OLD10")).thenReturn(Optional.of(voucher));

        assertThatThrownBy(() -> service.validateAndCalculateDiscount("OLD10", BigDecimal.valueOf(100_000))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("hết hạn");
    }

    @Test
    void voucherWithNoRemainingUsageIsRejected() {
        Voucher voucher = Voucher.builder().code("LIMIT1").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(true).usageLimit(5).usedCount(5).build();
        when(repository.findByCodeIgnoreCase("LIMIT1")).thenReturn(Optional.of(voucher));

        assertThatThrownBy(() -> service.validateAndCalculateDiscount("LIMIT1", BigDecimal.valueOf(100_000))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("hết lượt");
    }

    @Test
    void subtotalBelowMinOrderAmountIsRejected() {
        Voucher voucher = Voucher.builder().code("MIN200K").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(true).minOrderAmount(BigDecimal.valueOf(200_000)).build();
        when(repository.findByCodeIgnoreCase("MIN200K")).thenReturn(Optional.of(voucher));

        assertThatThrownBy(() -> service.validateAndCalculateDiscount("MIN200K", BigDecimal.valueOf(100_000))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("tối thiểu");
    }

    @Test
    void inactiveVoucherIsRejected() {
        Voucher voucher = Voucher.builder().code("PAUSED").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(false).build();
        when(repository.findByCodeIgnoreCase("PAUSED")).thenReturn(Optional.of(voucher));

        assertThatThrownBy(() -> service.validateAndCalculateDiscount("PAUSED", BigDecimal.valueOf(100_000))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("ngưng hoạt động");
    }

    @Test
    void unknownVoucherCodeIsRejected() {
        when(repository.findByCodeIgnoreCase("MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.validateAndCalculateDiscount("MISSING", BigDecimal.valueOf(100_000))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("không tồn tại");
    }

    @Test
    void incrementUsageClaimsOneUseAtomically() {
        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class),
                org.mockito.ArgumentMatchers.eq(Voucher.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));

        service.incrementUsage("INC1");

        verify(mongoTemplate).updateFirst(any(Query.class), any(Update.class),
                org.mockito.ArgumentMatchers.eq(Voucher.class));
    }

    @Test
    void incrementUsageThrowsWhenNoVoucherCanBeClaimed() {
        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class),
                org.mockito.ArgumentMatchers.eq(Voucher.class)))
                .thenReturn(UpdateResult.acknowledged(1, 0L, null));

        assertThatThrownBy(() -> service.incrementUsage("RACE1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("hết lượt");
    }

    @Test
    void releaseUsageUsesAtomicDecrement() {
        service.releaseUsage("REL1");

        verify(mongoTemplate).updateFirst(any(Query.class), any(Update.class),
                org.mockito.ArgumentMatchers.eq(Voucher.class));
    }
}
