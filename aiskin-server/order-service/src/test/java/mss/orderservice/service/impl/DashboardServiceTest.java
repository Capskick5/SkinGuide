package mss.orderservice.service.impl;

import mss.orderservice.model.CompensationOrder;
import mss.orderservice.model.Order;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    private OrderRepository orderRepository;
    private ReturnOrderRepository returnOrderRepository;
    private RefundRequestRepository refundRequestRepository;
    private CompensationOrderRepository compensationOrderRepository;
    private DashboardService service;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        returnOrderRepository = mock(ReturnOrderRepository.class);
        refundRequestRepository = mock(RefundRequestRepository.class);
        compensationOrderRepository = mock(CompensationOrderRepository.class);
        service = new DashboardService(orderRepository, returnOrderRepository,
                refundRequestRepository, compensationOrderRepository);
    }

    @Test
    void separatesCollectedShippingFromAllShopShippingCosts() {
        LocalDateTime now = LocalDateTime.now();
        Order shippedOrder = Order.builder()
                .id("order-1")
                .totalAmount(new BigDecimal("550000"))
                .shippingFee(new BigDecimal("30000"))
                .actualShippingFee(new BigDecimal("32000"))
                .trackingCode("GHN-ORIGINAL")
                .paymentStatus(Order.PaymentStatus.PAID)
                .paidAt(now.minusDays(2))
                .createdAt(now.minusDays(3))
                .build();
        Order notShippedOrder = Order.builder()
                .id("order-2")
                .totalAmount(new BigDecimal("220000"))
                .shippingFee(new BigDecimal("20000"))
                .paymentStatus(Order.PaymentStatus.REFUNDED)
                .paidAt(now.minusDays(1))
                .createdAt(now.minusDays(2))
                .build();

        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .claimType(ReturnOrder.ClaimType.WRONG_ITEM)
                .status(ReturnOrder.ReturnStatus.REDELIVERING)
                .returnTrackingCode("GHN-RETURN")
                .returnShippingFee(new BigDecimal("28000"))
                .createdAt(now.minusDays(1))
                .updatedAt(now.minusDays(1))
                .build();
        CompensationOrder compensation = CompensationOrder.builder()
                .id("compensation-1")
                .status(CompensationOrder.CompensationStatus.SHIPPING)
                .trackingCode("GHN-REDELIVERY")
                .shippingFee(new BigDecimal("25000"))
                .createdAt(now)
                .updatedAt(now)
                .build();

        RefundRequest completedRefund = refund("120000", RefundRequest.RefundStatus.COMPLETED, now);
        RefundRequest pendingRefund = refund("50000", RefundRequest.RefundStatus.PENDING, now);

        when(orderRepository.findAllPaidOrders()).thenReturn(List.of(shippedOrder, notShippedOrder));
        when(returnOrderRepository.findAll()).thenReturn(List.of(returnOrder));
        when(refundRequestRepository.findAll()).thenReturn(List.of(completedRefund, pendingRefund));
        when(compensationOrderRepository.findAll()).thenReturn(List.of(compensation));

        Map<String, Object> result = service.getFinancialSummary();

        assertThat(result.get("grossRevenue")).isEqualTo(new BigDecimal("770000"));
        assertThat(result.get("shippingCollected")).isEqualTo(new BigDecimal("50000"));
        assertThat(result.get("originalShippingCost")).isEqualTo(new BigDecimal("32000"));
        assertThat(result.get("returnShippingCost")).isEqualTo(new BigDecimal("28000"));
        assertThat(result.get("redeliveryShippingCost")).isEqualTo(new BigDecimal("25000"));
        assertThat(result.get("totalShippingCost")).isEqualTo(new BigDecimal("85000"));
        assertThat(result.get("shopShippingSubsidy")).isEqualTo(new BigDecimal("35000"));
        assertThat(result.get("completedRefundAmount")).isEqualTo(new BigDecimal("120000"));
        assertThat(result.get("pendingRefundAmount")).isEqualTo(new BigDecimal("50000"));
        assertThat(result.get("netCashAfterRefundAndShipping")).isEqualTo(new BigDecimal("565000"));
        assertThat(result.get("activeRedeliveryCount")).isEqualTo(1L);

        @SuppressWarnings("unchecked")
        Map<String, Long> claimTypeCounts = (Map<String, Long>) result.get("claimTypeCounts");
        assertThat(claimTypeCounts.get("WRONG_ITEM")).isEqualTo(1L);
        assertThat(claimTypeCounts.get("MISSING_ITEM")).isZero();
    }

    @Test
    void keepsZeroValuesWhenThereIsNoData() {
        when(orderRepository.findAllPaidOrders()).thenReturn(List.of());
        when(returnOrderRepository.findAll()).thenReturn(List.of());
        when(refundRequestRepository.findAll()).thenReturn(List.of());
        when(compensationOrderRepository.findAll()).thenReturn(List.of());

        Map<String, Object> result = service.getFinancialSummary();

        assertThat(result.get("grossRevenue")).isEqualTo(BigDecimal.ZERO);
        assertThat(result.get("totalShippingCost")).isEqualTo(BigDecimal.ZERO);
        assertThat(result.get("averageShippingCostPerShipment")).isEqualTo(BigDecimal.ZERO);
        assertThat(result.get("totalReturnCount")).isEqualTo(0);
        assertThat(result.get("totalCompensationCount")).isEqualTo(0);
    }

    private RefundRequest refund(String amount, RefundRequest.RefundStatus status, LocalDateTime time) {
        RefundRequest request = new RefundRequest();
        request.setAmount(new BigDecimal(amount));
        request.setStatus(status);
        request.setCreatedAt(time.minusHours(1));
        request.setUpdatedAt(time);
        return request;
    }
}
