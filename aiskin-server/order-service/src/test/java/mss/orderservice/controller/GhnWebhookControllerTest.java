package mss.orderservice.controller;

import mss.orderservice.config.GhnConfig;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.service.ICompensationOrderService;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.service.impl.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import mss.orderservice.service.IOrderService;

class GhnWebhookControllerTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);

    private final ReturnOrderRepository returnOrderRepository = mock(ReturnOrderRepository.class);
    private final CompensationOrderRepository compensationOrderRepository = mock(CompensationOrderRepository.class);
    private final ICompensationOrderService compensationOrderService = mock(ICompensationOrderService.class);

    private final IOrderService orderService = mock(OrderService.class);

    private final GhnConfig ghnConfig = mock(GhnConfig.class);

    private final GhnWebhookController controller = new GhnWebhookController(orderRepository, returnOrderRepository,
            orderService, ghnConfig, compensationOrderRepository, compensationOrderService);

    @Test
    void rejectsBlankRequiredFieldsAfterAuthenticatingWebhook() {
        when(ghnConfig.getWebhookSecret()).thenReturn("webhook-secret");
        ResponseEntity<String> response = controller.handleGhnWebhook(Map.of("OrderCode", "", "Status", "delivered"), "webhook-secret", null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(orderRepository, returnOrderRepository);
    }

    @Test
    void rejectsNonStringRequiredFieldsAsBadRequest() {
        when(ghnConfig.getWebhookSecret()).thenReturn("webhook-secret");
        ResponseEntity<String> response = controller.handleGhnWebhook(Map.of("OrderCode", 123, "Status", "delivered"), "webhook-secret", null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(orderRepository, returnOrderRepository);
    }

    @Test
    void deliveredWebhookMovesReturnToWarehouseWaitingForInspection() {
        when(ghnConfig.getWebhookSecret()).thenReturn("webhook-secret");
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .returnTrackingCode("GHN-RETURN-1")
                .status(ReturnOrder.ReturnStatus.DELIVERING)
                .build();
        when(orderRepository.findByTrackingCode("GHN-RETURN-1")).thenReturn(Optional.empty());
        when(returnOrderRepository.findByReturnTrackingCode("GHN-RETURN-1")).thenReturn(Optional.of(returnOrder));

        ResponseEntity<String> response = controller.handleGhnWebhook(
                Map.of("OrderCode", "GHN-RETURN-1", "Status", "delivered"),
                "webhook-secret", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(returnOrder.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.DELIVERED);
        verify(returnOrderRepository).save(returnOrder);
    }

    @Test
    void lateShippingWebhookCannotMoveWarehouseReturnBackToDelivering() {
        when(ghnConfig.getWebhookSecret()).thenReturn("webhook-secret");
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .returnTrackingCode("GHN-RETURN-1")
                .status(ReturnOrder.ReturnStatus.DELIVERED)
                .build();
        when(orderRepository.findByTrackingCode("GHN-RETURN-1")).thenReturn(Optional.empty());
        when(returnOrderRepository.findByReturnTrackingCode("GHN-RETURN-1")).thenReturn(Optional.of(returnOrder));

        ResponseEntity<String> response = controller.handleGhnWebhook(
                Map.of("OrderCode", "GHN-RETURN-1", "Status", "transporting"),
                "webhook-secret", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(returnOrder.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.DELIVERED);
        verify(returnOrderRepository, never()).save(returnOrder);
    }
}
