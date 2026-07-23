package mss.orderservice.service.impl;
import mss.orderservice.service.*;


import mss.orderservice.dto.RefundCreateRequest;
import mss.orderservice.dto.RefundBankDetailsRequest;
import mss.orderservice.model.Order;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.model.CompensationOrder;
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
    private CompensationOrderRepository compensationOrderRepository;

    private IRefundRequestService service;

    @BeforeEach
    void setUp() {
        refundRequestRepository = mock(RefundRequestRepository.class);
        returnOrderRepository = mock(ReturnOrderRepository.class);
        orderRepository = mock(OrderRepository.class);
        compensationOrderRepository = mock(CompensationOrderRepository.class);
        service = new RefundRequestService(
                refundRequestRepository,
                returnOrderRepository,
                orderRepository,
                compensationOrderRepository);
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
        assertThat(returnOrder.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.REFUND_PROCESSING);
        verify(returnOrderRepository).save(returnOrder);
    }

    @Test
    void completingRefundUpdatesRefundReturnAndOriginalOrder() {
        RefundRequest refund = pendingRefund();
        ReturnOrder returnOrder = receivedReturn();
        returnOrder.setStatus(ReturnOrder.ReturnStatus.REFUND_PROCESSING);
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

    @Test
    void returnedRedeliveryCannotBePaidBeforeWarehouseInspection() {
        RefundRequest refund = pendingRefund();
        ReturnOrder returnOrder = receivedReturn();
        CompensationOrder compensation = CompensationOrder.builder()
                .id("comp-1")
                .returnOrderId("return-1")
                .status(CompensationOrder.CompensationStatus.RETURNED_INSPECTION)
                .returnInventoryProcessed(false)
                .build();
        when(refundRequestRepository.findById("refund-1")).thenReturn(Optional.of(refund));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        when(compensationOrderRepository.findByReturnOrderId("return-1"))
                .thenReturn(Optional.of(compensation));

        assertThatThrownBy(() -> service.completeRefund("refund-1", null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("chưa được kho kiểm tra");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectingBankDetailsMovesClaimBackToWaitingForCustomer() {
        RefundRequest refund = pendingRefund();
        ReturnOrder returnOrder = receivedReturn();
        returnOrder.setStatus(ReturnOrder.ReturnStatus.REFUND_PROCESSING);
        when(refundRequestRepository.findById("refund-1")).thenReturn(Optional.of(refund));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        RefundRequest result = service.rejectRefund("refund-1");

        assertThat(result.getStatus()).isEqualTo(RefundRequest.RefundStatus.REJECTED);
        assertThat(returnOrder.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.REFUND_PENDING);
        verify(returnOrderRepository).save(returnOrder);
    }

    @Test
    void resubmittingBankDetailsMovesClaimBackToProcessing() {
        RefundRequest refund = pendingRefund();
        refund.setStatus(RefundRequest.RefundStatus.REJECTED);
        ReturnOrder returnOrder = receivedReturn();
        when(refundRequestRepository.findById("refund-1")).thenReturn(Optional.of(refund));
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        RefundRequest result = service.resubmitRefund(
                "refund-1",
                new RefundBankDetailsRequest("Techcombank", "9876543210", "Nguyen Van A"));

        assertThat(result.getStatus()).isEqualTo(RefundRequest.RefundStatus.PENDING);
        assertThat(returnOrder.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.REFUND_PROCESSING);
        verify(returnOrderRepository).save(returnOrder);
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


