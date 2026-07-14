package mss.orderservice.controller;

import mss.orderservice.config.GhnConfig;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import mss.orderservice.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

class GhnWebhookControllerTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final ReturnOrderRepository returnOrderRepository = mock(ReturnOrderRepository.class);
    private final OrderService orderService = mock(OrderService.class);
    private final GhnConfig ghnConfig = mock(GhnConfig.class);
    private final GhnWebhookController controller =
            new GhnWebhookController(orderRepository, returnOrderRepository, orderService, ghnConfig);

    @Test
    void rejectsBlankRequiredFieldsAfterAuthenticatingWebhook() {
        when(ghnConfig.getWebhookSecret()).thenReturn("webhook-secret");
        ResponseEntity<String> response = controller.handleGhnWebhook(
                Map.of("OrderCode", "", "Status", "delivered"), "webhook-secret", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(orderRepository, returnOrderRepository);
    }

    @Test
    void rejectsNonStringRequiredFieldsAsBadRequest() {
        when(ghnConfig.getWebhookSecret()).thenReturn("webhook-secret");
        ResponseEntity<String> response = controller.handleGhnWebhook(
                Map.of("OrderCode", 123, "Status", "delivered"), "webhook-secret", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(orderRepository, returnOrderRepository);
    }
}
