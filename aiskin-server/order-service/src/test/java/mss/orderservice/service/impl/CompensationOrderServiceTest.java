package mss.orderservice.service.impl;

import mss.orderservice.model.CompensationOrder;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import mss.orderservice.service.CompensationInventoryClient;
import mss.orderservice.service.IGhnService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CompensationOrderServiceTest {
    private CompensationOrderRepository repository;
    private ReturnOrderRepository returnOrderRepository;
    private OrderRepository orderRepository;
    private CompensationInventoryClient inventoryClient;
    private IGhnService ghnService;
    private CompensationOrderService service;

    @BeforeEach
    void setUp() {
        repository = mock(CompensationOrderRepository.class);
        returnOrderRepository = mock(ReturnOrderRepository.class);
        orderRepository = mock(OrderRepository.class);
        inventoryClient = mock(CompensationInventoryClient.class);
        ghnService = mock(IGhnService.class);
        service = new CompensationOrderService(repository, returnOrderRepository,
                orderRepository, inventoryClient, ghnService);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void reservingCompensationInventoryIsIdempotent() {
        CompensationOrder compensation = pendingCompensation();
        when(repository.findById("comp-1")).thenReturn(Optional.of(compensation));

        service.reserveInventory("comp-1");
        service.reserveInventory("comp-1");

        verify(inventoryClient, times(1)).reserve(compensation);
        assertThat(compensation.getStatus()).isEqualTo(CompensationOrder.CompensationStatus.INVENTORY_RESERVED);
    }

    @Test
    void completingDeliveryCommitsInventoryAndResolvesClaim() {
        CompensationOrder compensation = pendingCompensation();
        compensation.setStatus(CompensationOrder.CompensationStatus.SHIPPING);
        compensation.setInventoryReserved(true);
        ReturnOrder claim = ReturnOrder.builder()
                .id("return-1")
                .status(ReturnOrder.ReturnStatus.REDELIVERING)
                .resolution(ReturnOrder.ResolutionType.REDELIVER)
                .build();
        when(repository.findById("comp-1")).thenReturn(Optional.of(compensation));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(claim));

        service.complete("comp-1");

        verify(inventoryClient).commit(compensation);
        assertThat(compensation.getStatus()).isEqualTo(CompensationOrder.CompensationStatus.COMPLETED);
        assertThat(claim.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.RESOLVED);
    }

    @Test
    void synchronizingDeliveredGhnOrderCompletesRedeliveryAndResolvesClaim() {
        CompensationOrder compensation = pendingCompensation();
        compensation.setStatus(CompensationOrder.CompensationStatus.SHIPPING);
        compensation.setInventoryReserved(true);
        compensation.setTrackingCode("GHN-REDELIVERY");
        ReturnOrder claim = ReturnOrder.builder()
                .id("return-1")
                .status(ReturnOrder.ReturnStatus.REDELIVERING)
                .resolution(ReturnOrder.ResolutionType.REDELIVER)
                .build();
        when(repository.findByStatus(CompensationOrder.CompensationStatus.SHIPPING))
                .thenReturn(List.of(compensation));
        when(repository.findById("comp-1")).thenReturn(Optional.of(compensation));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(claim));
        when(ghnService.getOrderDetail("GHN-REDELIVERY"))
                .thenReturn(Map.of("status", "deliveried"));

        service.syncGhnCompensationOrderStatus();

        verify(inventoryClient).commit(compensation);
        assertThat(compensation.getStatus()).isEqualTo(CompensationOrder.CompensationStatus.COMPLETED);
        assertThat(claim.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.RESOLVED);
    }

    @Test
    void synchronizingShippingGhnOrderDoesNotCompleteRedeliveryEarly() {
        CompensationOrder compensation = pendingCompensation();
        compensation.setStatus(CompensationOrder.CompensationStatus.SHIPPING);
        compensation.setTrackingCode("GHN-REDELIVERY");
        when(repository.findByStatus(CompensationOrder.CompensationStatus.SHIPPING))
                .thenReturn(List.of(compensation));
        when(ghnService.getOrderDetail("GHN-REDELIVERY"))
                .thenReturn(Map.of("status", "delivering"));

        service.syncGhnCompensationOrderStatus();

        verify(inventoryClient, never()).commit(any());
        assertThat(compensation.getStatus()).isEqualTo(CompensationOrder.CompensationStatus.SHIPPING);
    }

    @Test
    void creatingRedeliveryUsesANewGhnOrderAndTrackingCode() {
        CompensationOrder compensation = pendingCompensation();
        compensation.setOrderId("order-1");
        compensation.setStatus(CompensationOrder.CompensationStatus.INVENTORY_RESERVED);
        mss.orderservice.model.Order original = mss.orderservice.model.Order.builder()
                .id("order-1")
                .orderCode("ORD-1")
                .trackingCode("GHN-ORIGINAL")
                .customerName("Customer")
                .customerPhone("0900000000")
                .shippingAddress("TP HCM")
                .ghnWardCode("123")
                .ghnDistrictId(456)
                .build();
        ReturnOrder claim = ReturnOrder.builder()
                .id("return-1")
                .returnTrackingCode("GHN-RETURN")
                .redeliveryTrackingCode("GHN-OLD-STALE")
                .status(ReturnOrder.ReturnStatus.REDELIVERY_PENDING)
                .build();
        when(repository.findById("comp-1")).thenReturn(Optional.of(compensation));
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(original));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(claim));
        when(ghnService.createOrder(any())).thenReturn(Map.of(
                "order_code", "GHN-REDELIVERY-NEW",
                "total_fee", 25_000));

        CompensationOrder result = service.createShipment("comp-1");

        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(ghnService).createOrder(payload.capture());
        assertThat(payload.getValue().get("client_order_code")).isEqualTo("REDL-comp-1");
        assertThat(payload.getValue().get("cod_amount")).isEqualTo(0);
        assertThat(result.getTrackingCode()).isEqualTo("GHN-REDELIVERY-NEW");
        assertThat(result.getTrackingCode()).isNotEqualTo(original.getTrackingCode());
        assertThat(result.getTrackingCode()).isNotEqualTo(claim.getReturnTrackingCode());
        assertThat(claim.getRedeliveryTrackingCode()).isEqualTo("GHN-REDELIVERY-NEW");
        assertThat(claim.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.REDELIVERING);
    }

    private CompensationOrder pendingCompensation() {
        return CompensationOrder.builder()
                .id("comp-1")
                .returnOrderId("return-1")
                .status(CompensationOrder.CompensationStatus.PENDING)
                .items(List.of(CompensationOrder.CompensationItem.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(1)
                        .build()))
                .build();
    }
}
