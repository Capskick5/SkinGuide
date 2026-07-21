package mss.orderservice.service.impl;

import mss.orderservice.model.Voucher;
import mss.orderservice.repository.VoucherRepository;
import org.junit.jupiter.api.Test;
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
    private final VoucherService service = new VoucherService(repository);

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
    void incrementUsageIncreasesUsedCountAndPersists() {
        Voucher voucher = Voucher.builder().code("INC1").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(true).usedCount(2).build();
        when(repository.findByCodeIgnoreCase("INC1")).thenReturn(Optional.of(voucher));
        when(repository.save(any(Voucher.class))).thenAnswer(inv -> inv.getArgument(0));

        service.incrementUsage("INC1");

        assertThat(voucher.getUsedCount()).isEqualTo(3);
        verify(repository).save(voucher);
    }

    @Test
    void incrementUsageThrowsWhenLimitReachedByRaceCondition() {
        Voucher voucher = Voucher.builder().code("RACE1").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(true).usageLimit(3).usedCount(3).build();
        when(repository.findByCodeIgnoreCase("RACE1")).thenReturn(Optional.of(voucher));

        assertThatThrownBy(() -> service.incrementUsage("RACE1")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void releaseUsageDecrementsUsedCountAndPersists() {
        Voucher voucher = Voucher.builder().code("REL1").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(true).usedCount(3).build();
        when(repository.findByCodeIgnoreCase("REL1")).thenReturn(Optional.of(voucher));
        when(repository.save(any(Voucher.class))).thenAnswer(inv -> inv.getArgument(0));

        service.releaseUsage("REL1");

        assertThat(voucher.getUsedCount()).isEqualTo(2);
        verify(repository).save(voucher);
    }

    @Test
    void releaseUsageNeverGoesNegative() {
        Voucher voucher = Voucher.builder().code("REL0").discountType(Voucher.DiscountType.FIXED).discountValue(BigDecimal.valueOf(10_000)).isActive(true).usedCount(0).build();
        when(repository.findByCodeIgnoreCase("REL0")).thenReturn(Optional.of(voucher));
        when(repository.save(any(Voucher.class))).thenAnswer(inv -> inv.getArgument(0));

        service.releaseUsage("REL0");

        assertThat(voucher.getUsedCount()).isEqualTo(0);
    }
}
