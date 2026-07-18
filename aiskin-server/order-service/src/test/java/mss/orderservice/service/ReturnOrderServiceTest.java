package mss.orderservice.service;

import mss.orderservice.dto.ReturnItemRequest;
import mss.orderservice.dto.ReturnRequest;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReturnOrderServiceTest {

    private ReturnOrderRepository returnOrderRepository;

    private OrderRepository orderRepository;

    private ReturnInventoryClient returnInventoryClient;

    private IGhnService ghnService;

    private IReturnOrderService service;

    @BeforeEach
    void setUp() {
        returnOrderRepository = mock(ReturnOrderRepository.class);
        orderRepository = mock(OrderRepository.class);
        returnInventoryClient = mock(ReturnInventoryClient.class);
        ghnService = mock(GhnService.class);
        service = new ReturnOrderService(returnOrderRepository, orderRepository, ghnService, returnInventoryClient);
        when(returnOrderRepository.save(any(ReturnOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createReturnKeepsTheSelectedVariantAndSku() {
        Order order = deliveredOrder();
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(order));
        when(returnOrderRepository.findByOrderId("order-1")).thenReturn(Optional.empty());
        ReturnOrder result = service.createReturnRequest("order-1", returnRequest());
        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getVariantId()).isEqualTo("variant-2");
            assertThat(item.getSku()).isEqualTo("SKU-2");
        });
    }

    @Test
    void receivingReturnProcessesInventoryOnceWithSelectedDisposition() {
        ReturnOrder returnOrder = ReturnOrder.builder().id("return-1").orderId("order-1").orderCode("ORD-1").status(ReturnOrder.ReturnStatus.DELIVERED).inventoryProcessed(false).items(List.of(ReturnOrder.ReturnItem.builder().productId("product-1").variantId("variant-2").sku("SKU-2").quantity(1).build())).build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        ReturnOrder result = service.updateReturnStatus("return-1", ReturnOrder.ReturnStatus.RECEIVED, null, ReturnOrder.InventoryDisposition.DAMAGED);
        verify(returnInventoryClient).process(returnOrder, ReturnOrder.InventoryDisposition.DAMAGED);
        assertThat(result.getInventoryProcessed()).isTrue();
        assertThat(result.getInventoryDisposition()).isEqualTo(ReturnOrder.InventoryDisposition.DAMAGED);
    }

    @Test
    void receivingApprovedReturnSupportsManualWarehouseConfirmation() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.APPROVED);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        service.updateReturnStatus("return-1", ReturnOrder.ReturnStatus.RECEIVED, null, ReturnOrder.InventoryDisposition.RESTOCK);
        verify(returnInventoryClient).process(returnOrder, ReturnOrder.InventoryDisposition.RESTOCK);
        assertThat(returnOrder.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.RECEIVED);
    }

    @Test
    void approvingReturnKeepsApprovalWhenGhnIsUnavailable() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.PENDING);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(deliveredOrder()));
        when(ghnService.createOrder(any())).thenThrow(new IllegalStateException("GHN unavailable"));
        ReturnOrder result = service.updateReturnStatus("return-1", ReturnOrder.ReturnStatus.APPROVED, null, null);
        assertThat(result.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.APPROVED);
        assertThat(result.getReturnTrackingCode()).isNull();
        assertThat(result.getReturnShipmentError()).contains("Admin có thể xác nhận nhận hàng thủ công");
        verify(returnOrderRepository).save(returnOrder);
    }

    @Test
    void pendingReturnCannotSkipApprovalAndWarehouseReceipt() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.PENDING);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        assertThatThrownBy(() -> service.updateReturnStatus("return-1", ReturnOrder.ReturnStatus.REFUNDED, null, null)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("hoàn tiền qua yêu cầu hoàn tiền");
        verify(returnInventoryClient, never()).process(any(), any());
        verify(returnOrderRepository, never()).save(any());
    }

    private ReturnRequest returnRequest() {
        return new ReturnRequest("Không phù hợp", "Sản phẩm gây kích ứng khi sử dụng", List.of("/api/orders/uploads/123e4567-e89b-12d3-a456-426614174000.jpg"), List.of(new ReturnItemRequest("product-1", "variant-2", "SKU-2", "100 ml", 1)));
    }

    private ReturnOrder returnOrder(ReturnOrder.ReturnStatus status) {
        return ReturnOrder.builder().id("return-1").orderId("order-1").orderCode("ORD-1").status(status).inventoryProcessed(false).items(List.of(ReturnOrder.ReturnItem.builder().productId("product-1").variantId("variant-2").sku("SKU-2").quantity(1).build())).build();
    }

    private Order deliveredOrder() {
        return Order.builder().id("order-1").orderCode("ORD-1").status(Order.OrderStatus.DELIVERED).paymentStatus(Order.PaymentStatus.PAID).items(List.of(orderItem("variant-1", "SKU-1", "50 ml"), orderItem("variant-2", "SKU-2", "100 ml"))).build();
    }

    private OrderItem orderItem(String variantId, String sku, String unit) {
        return OrderItem.builder().productId("product-1").variantId(variantId).sku(sku).variantName(unit).productName("Cleanser").unit(unit).quantity(2).unitPrice(BigDecimal.valueOf(100_000)).build();
    }
}
