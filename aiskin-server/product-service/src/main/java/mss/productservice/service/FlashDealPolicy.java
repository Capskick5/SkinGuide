package mss.productservice.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class FlashDealPolicy {
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public Instant startsAt() {
        ZonedDateTime now = ZonedDateTime.now(VIETNAM_ZONE);
        return now.withHour(now.getHour() < 12 ? 0 : 12).withMinute(0).withSecond(0).withNano(0).toInstant();
    }

    public Instant endsAt() {
        return startsAt().plusSeconds(43_200);
    }

    public Set<String> selectProductIds(List<String> activeProductIds) {
        long seed = startsAt().getEpochSecond();
        return activeProductIds.stream().filter(id -> id != null && !id.isBlank())
                .sorted(Comparator.comparingLong(id -> score(seed, id))).limit(10).collect(Collectors.toSet());
    }

    public int discountPercent(String categoryId) {
        return 10 + Math.floorMod(String.valueOf(categoryId).hashCode(), 21);
    }

    public BigDecimal dealPrice(BigDecimal originalPrice, int discountPercent) {
        return originalPrice.multiply(BigDecimal.valueOf(100L - discountPercent))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    private long score(long seed, String id) {
        long value = seed ^ id.hashCode();
        value ^= value << 13;
        value ^= value >>> 7;
        return value ^ (value << 17);
    }
}
