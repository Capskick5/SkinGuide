package mss.orderservice.service;

import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReturnOrderServiceTest {

    private ReturnOrderRepository returnOrderRepository;
    private OrderRepository orderRepository;
    private ReturnInventoryClient returnInventoryClient;
    private ReturnOrderService service;

    @BeforeEach
    void setUp() {
        returnOrderRepository = mock(ReturnOrderRepository.class);
        orderRepository = mock(OrderRepository.class);
        returnInventoryClient = mock(ReturnInventoryClient.class);
        service = new ReturnOrderService(
                returnOrderRepository,
                orderRepository,
                mock(GhnService.class),
                returnInventoryClient);
        when(returnOrderRepository.save(any(ReturnOrder.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createReturnKeepsTheSelectedVariantAndSku() {
        Order order = deliveredOrder();
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(order));
        when(returnOrderRepository.findByOrderId("order-1")).thenReturn(Optional.empty());

        ReturnOrder result = service.createReturnRequest("order-1", Map.of(
                "items", List.of(Map.of(
                        "productId", "product-1",
                        "variantId", "variant-2",
                        "sku", "SKU-2",
                        "unit", "100 ml",
                        "quantity", 1)),
                "reason", "Không phù hợp"));

        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getVariantId()).isEqualTo("variant-2");
            assertThat(item.getSku()).isEqualTo("SKU-2");
        });
    }

    @Test
    void receivingReturnProcessesInventoryOnceWithSelectedDisposition() {
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .orderId("order-1")
                .orderCode("ORD-1")
                .status(ReturnOrder.ReturnStatus.DELIVERED)
                .inventoryProcessed(false)
                .items(List.of(ReturnOrder.ReturnItem.builder()
                        .productId("product-1")
                        .variantId("variant-2")
                        .sku("SKU-2")
                        .quantity(1)
                        .build()))
                .build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        ReturnOrder result = service.updateReturnStatus(
                "return-1", "RECEIVED", null, "DAMAGED");

        verify(returnInventoryClient).process(returnOrder, ReturnOrder.InventoryDisposition.DAMAGED);
        assertThat(result.getInventoryProcessed()).isTrue();
        assertThat(result.getInventoryDisposition()).isEqualTo(ReturnOrder.InventoryDisposition.DAMAGED);
    }

    private Order deliveredOrder() {
        return Order.builder()
                .id("order-1")
                .orderCode("ORD-1")
                .status(Order.OrderStatus.DELIVERED)
                .paymentStatus(Order.PaymentStatus.PAID)
                .items(List.of(
                        orderItem("variant-1", "SKU-1", "50 ml"),
                        orderItem("variant-2", "SKU-2", "100 ml")))
                .build();
    }

    private OrderItem orderItem(String variantId, String sku, String unit) {
        return OrderItem.builder()
                .productId("product-1")
                .variantId(variantId)
                .sku(sku)
                .variantName(unit)
                .productName("Cleanser")
                .unit(unit)
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(100_000))
                .build();
    }
}
