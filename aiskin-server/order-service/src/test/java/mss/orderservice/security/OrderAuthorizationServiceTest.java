package mss.orderservice.security;

import mss.orderservice.model.Order;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrderAuthorizationServiceTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);

    private final IOrderAuthorizationService service = new OrderAuthorizationService(orderRepository, mock(ReturnOrderRepository.class), mock(RefundRequestRepository.class));

    @Test
    void allowsOwnerAndRejectsAnotherCustomer() {
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(Order.builder().customerId("user-1").build()));
        service.requireOrderAccess("order-1", authentication("user-1", "ROLE_CUSTOMER"));
        assertThatThrownBy(() -> service.requireOrderAccess("order-1", authentication("user-2", "ROLE_CUSTOMER"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("403 FORBIDDEN");
    }

    @Test
    void allowsAdminToAccessAnyCustomerOrder() {
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(Order.builder().customerId("user-1").build()));
        service.requireOrderAccess("order-1", authentication("admin-1", "ROLE_ADMIN"));
    }

    private UsernamePasswordAuthenticationToken authentication(String userId, String role) {
        return new UsernamePasswordAuthenticationToken(userId, null, List.of(new SimpleGrantedAuthority(role)));
    }
}
