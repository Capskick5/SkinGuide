package mss.orderservice.controller;

import mss.orderservice.security.OrderAuthorizationService;
import mss.orderservice.service.impl.DashboardService;
import mss.orderservice.service.impl.OrderService;
import mss.orderservice.service.PaymentConfigurationValidator;
import mss.orderservice.service.PaymentWebhookVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import mss.orderservice.security.IOrderAuthorizationService;
import mss.orderservice.service.IOrderService;

class OrderControllerErrorHandlingTest {

    private IOrderService orderService;

    private IOrderAuthorizationService authorizationService;

    private OrderController controller;

    @BeforeEach
    void setUp() {
        orderService = mock(OrderService.class);
        authorizationService = mock(OrderAuthorizationService.class);
        controller = new OrderController(orderService, mock(DashboardService.class), authorizationService, mock(PaymentWebhookVerifier.class), mock(PaymentConfigurationValidator.class));
    }

    @Test
    void unexpectedCancellationFailureIsDelegatedToGlobalHandler() {
        var authentication = new UsernamePasswordAuthenticationToken("customer-1", null);
        doNothing().when(authorizationService).requireOrderAccess("order-1", authentication);
        when(orderService.cancelOrder("order-1", "Changed my mind")).thenThrow(new RuntimeException("mongodb://database.internal:27017"));
        assertThatThrownBy(() -> controller.cancelOrder("order-1", Map.of("cancelReason", "Changed my mind"), authentication)).isInstanceOf(RuntimeException.class).hasMessageContaining("database.internal");
    }

    @Test
    void unexpectedGhnSyncFailureIsDelegatedToGlobalHandler() {
        org.mockito.Mockito.doThrow(new RuntimeException("carrier-secret-detail")).when(orderService).syncGhnOrderStatus();
        assertThatThrownBy(controller::syncGhnOrderStatusManual).isInstanceOf(RuntimeException.class).hasMessageContaining("carrier-secret-detail");
    }
}
