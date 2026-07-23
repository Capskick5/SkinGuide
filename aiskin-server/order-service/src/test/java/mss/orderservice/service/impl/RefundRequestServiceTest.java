package mss.orderservice.service.impl;
import mss.orderservice.service.*;


import mss.orderservice.dto.RefundCreateRequest;
import mss.orderservice.model.Order;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RefundRequestServiceTest {

    private RefundRequestRepository refundRequestRepository;

    private ReturnOrderRepository returnOrderRepository;

    private OrderRepository orderRepository;

    private IRefundRequestService service;

    @BeforeEach
    void setUp() {
        refundRequestRepository = mock(RefundRequestRepository.class);
        returnOrderRepository = mock(ReturnOrderRepository.class);
        orderRepository = mock(OrderRepository.class);
        service = new RefundRequestService(refundRequestRepository, returnOrderRepository, orderRepository);
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void customerCreatesRefundForTheirReceivedReturn() {
        ReturnOrder returnOrder = receivedReturn();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        when(refundRequestRepository.findByReturnOrderId("return-1")).thenReturn(Optional.empty());
        RefundRequest result = service.createRefundRequest("customer-1", new RefundCreateRequest("return-1", "  Vietcombank ", "0123456789", "  Nguyen Van A "));
        assertThat(result.getAmount()).isEqualByComparingTo("150000");
        assertThat(result.getBankName()).isEqualTo("Vietcombank");
        assertThat(result.getAccountNumber()).isEqualTo("0123456789");
        assertThat(result.getAccountName()).isEqualTo("NGUYEN VAN A");
        assertThat(result.getStatus()).isEqualTo(RefundRequest.RefundStatus.PENDING);
    }

    @Test
    void completingRefundUpdatesRefundReturnAndOriginalOrder() {
        RefundRequest refund = pendingRefund();
        ReturnOrder returnOrder = receivedReturn();
        Order order = Order.builder().id("order-1").status(Order.OrderStatus.DELIVERED)
                .totalAmount(BigDecimal.valueOf(150_000)).paymentStatus(Order.PaymentStatus.PAID).build();
        when(refundRequestRepository.findById("refund-1")).thenReturn(Optional.of(refund));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(order));
        RefundRequest result = service.completeRefund("refund-1", "https://example.com/receipt.jpg");
        assertThat(result.getStatus()).isEqualTo(RefundRequest.RefundStatus.COMPLETED);
        assertThat(returnOrder.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.REFUNDED);
        assertThat(order.getStatus()).isEqualTo(Order.OrderStatus.DELIVERED);
        assertThat(order.getPaymentStatus()).isEqualTo(Order.PaymentStatus.REFUNDED);
        verify(orderRepository).save(order);
        verify(returnOrderRepository).save(returnOrder);
        verify(refundRequestRepository).save(refund);
    }

    @Test
    void refundCannotCompleteBeforeWarehouseProcessesReturnedInventory() {
        RefundRequest refund = pendingRefund();
        ReturnOrder returnOrder = receivedReturn();
        returnOrder.setInventoryProcessed(false);
        when(refundRequestRepository.findById("refund-1")).thenReturn(Optional.of(refund));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        assertThatThrownBy(() -> service.completeRefund("refund-1", null)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("chưa được kho phân loại");
        verify(orderRepository, never()).save(any());
        verify(returnOrderRepository, never()).save(any());
        verify(refundRequestRepository, never()).save(any());
    }

    @Test
    void completedRefundIsIdempotent() {
        RefundRequest refund = pendingRefund();
        refund.setStatus(RefundRequest.RefundStatus.COMPLETED);
        when(refundRequestRepository.findById("refund-1")).thenReturn(Optional.of(refund));
        assertThat(service.completeRefund("refund-1", null)).isSameAs(refund);
        verify(returnOrderRepository, never()).findById(any());
        verify(orderRepository, never()).findById(any());
    }

    @Test
    void redeliveryClaimCannotCreateRefundRequest() {
        ReturnOrder returnOrder = receivedReturn();
        returnOrder.setResolution(ReturnOrder.ResolutionType.REDELIVER);
        returnOrder.setStatus(ReturnOrder.ReturnStatus.REDELIVERY_PENDING);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        assertThatThrownBy(() -> service.createRefundRequest("customer-1",
                new RefundCreateRequest("return-1", "Vietcombank", "0123456789", "NGUYEN VAN A")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("giao lại");
        verify(refundRequestRepository, never()).save(any());
    }

    private ReturnOrder receivedReturn() {
        return ReturnOrder.builder().id("return-1").orderId("order-1").orderCode("ORD-1")
                .customerId("customer-1").customerName("Nguyen Van A")
                .claimType(ReturnOrder.ClaimType.RETURN).resolution(ReturnOrder.ResolutionType.REFUND)
                .refundAmount(BigDecimal.valueOf(150_000)).status(ReturnOrder.ReturnStatus.REFUND_PENDING)
                .inventoryProcessed(true).inventoryDisposition(ReturnOrder.InventoryDisposition.RESTOCK).build();
    }

    private RefundRequest pendingRefund() {
        RefundRequest refund = new RefundRequest();
        refund.setId("refund-1");
        refund.setReturnOrderId("return-1");
        refund.setOrderId("order-1");
        refund.setAmount(BigDecimal.valueOf(150_000));
        refund.setStatus(RefundRequest.RefundStatus.PENDING);
        return refund;
    }
}


