package mss.orderservice.repository;

import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.repository.Query;

import static org.assertj.core.api.Assertions.assertThat;

class OrderRepositoryTest {

    @Test
    void activeGhnQueryExcludesDeliveryFailStatus() throws NoSuchMethodException {
        Query query = OrderRepository.class
                .getMethod("findActiveGhnOrders")
                .getAnnotation(Query.class);

        assertThat(query).isNotNull();
        assertThat(query.value()).doesNotContain("DELIVERY_FAIL");
        assertThat(query.value()).doesNotContain("DELIVERY_FAILED");
    }
}
