package mss.orderservice.service.impl;

import mss.orderservice.model.Cart;
import mss.orderservice.repository.CartRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CartServiceTest {

    private final CartRepository repository = mock(CartRepository.class);
    private final CartService service = new CartService(repository);

    @Test
    void getReturnsEmptyWhenNoCart() {
        when(repository.findByUserId("u1")).thenReturn(Optional.empty());

        assertThat(service.get("u1")).isEmpty();
    }

    @Test
    void replaceCreatesCartWhenAbsentAndPersistsItems() {
        List<Map<String, Object>> items = List.of(Map.of("id", "p-1", "qty", 2));
        when(repository.findByUserId("u1")).thenReturn(Optional.empty());
        when(repository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        List<Map<String, Object>> saved = service.replace("u1", items);

        assertThat(saved).isEqualTo(items);
        verify(repository).save(any(Cart.class));
    }

    @Test
    void replaceWithNullStoresEmptyList() {
        when(repository.findByUserId("u1")).thenReturn(Optional.empty());
        when(repository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.replace("u1", null)).isEmpty();
    }

    @Test
    void clearDelegatesToRepository() {
        service.clear("u1");

        verify(repository).deleteByUserId("u1");
    }
}
