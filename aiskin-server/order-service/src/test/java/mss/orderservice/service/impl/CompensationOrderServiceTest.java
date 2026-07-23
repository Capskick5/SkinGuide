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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CompensationOrderServiceTest {
    private CompensationOrderRepository repository;
    private ReturnOrderRepository returnOrderRepository;
    private CompensationInventoryClient inventoryClient;
    private CompensationOrderService service;

    @BeforeEach
    void setUp() {
        repository = mock(CompensationOrderRepository.class);
        returnOrderRepository = mock(ReturnOrderRepository.class);
        inventoryClient = mock(CompensationInventoryClient.class);
        service = new CompensationOrderService(repository, returnOrderRepository,
                mock(OrderRepository.class), inventoryClient, mock(IGhnService.class));
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
