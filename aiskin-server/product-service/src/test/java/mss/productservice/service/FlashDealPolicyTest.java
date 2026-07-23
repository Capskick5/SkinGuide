package mss.productservice.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class FlashDealPolicyTest {

    private final FlashDealPolicy policy = new FlashDealPolicy();

    @Test
    void generatedDiscountAlwaysStaysBetweenFiveAndFifteenPercent() {
        IntStream.range(0, 100)
                .mapToObj(index -> policy.discountPercent("category-" + index))
                .forEach(discount -> assertThat(discount).isBetween(5, 15));
    }

    @Test
    void dealPriceIsCalculatedFromTheDatabasePrice() {
        BigDecimal databasePrice = BigDecimal.valueOf(200_000);

        assertThat(policy.dealPrice(databasePrice, 5)).isEqualByComparingTo("190000");
        assertThat(policy.dealPrice(databasePrice, 15)).isEqualByComparingTo("170000");
    }
}
