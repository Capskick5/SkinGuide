package mss.orderservice.service.impl;
import mss.orderservice.service.*;


import mss.orderservice.dto.ReturnItemRequest;
import mss.orderservice.dto.ReturnRequest;
import mss.orderservice.dto.WrongItemRequest;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.model.CompensationOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

class ReturnOrderServiceTest {

    private ReturnOrderRepository returnOrderRepository;

    private OrderRepository orderRepository;

    private ReturnInventoryClient returnInventoryClient;
    private CompensationOrderRepository compensationOrderRepository;

    private IGhnService ghnService;

    private IReturnOrderService service;

    @BeforeEach
    void setUp() {
        returnOrderRepository = mock(ReturnOrderRepository.class);
        orderRepository = mock(OrderRepository.class);
        returnInventoryClient = mock(ReturnInventoryClient.class);
        compensationOrderRepository = mock(CompensationOrderRepository.class);
        ghnService = mock(GhnService.class);
        service = new ReturnOrderService(returnOrderRepository, compensationOrderRepository, orderRepository, ghnService, returnInventoryClient);
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
        ReturnOrder returnOrder = ReturnOrder.builder().id("return-1").orderId("order-1").orderCode("ORD-1")
                .claimType(ReturnOrder.ClaimType.RETURN).resolution(ReturnOrder.ResolutionType.REFUND)
                .status(ReturnOrder.ReturnStatus.INSPECTING).inventoryProcessed(false)
                .items(List.of(ReturnOrder.ReturnItem.builder().productId("product-1").variantId("variant-2").sku("SKU-2").quantity(1).build())).build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        ReturnOrder result = service.updateReturnStatus("return-1", ReturnOrder.ReturnStatus.RECEIVED, null, ReturnOrder.InventoryDisposition.DAMAGED);
        verify(returnInventoryClient).process(returnOrder, ReturnOrder.InventoryDisposition.DAMAGED);
        assertThat(result.getInventoryProcessed()).isTrue();
        assertThat(result.getInventoryDisposition()).isEqualTo(ReturnOrder.InventoryDisposition.DAMAGED);
    }

    @Test
    void discardingReturnedProductStillRecordsInventoryProcessing() {
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .orderId("order-1")
                .orderCode("ORD-1")
                .claimType(ReturnOrder.ClaimType.RETURN)
                .resolution(ReturnOrder.ResolutionType.REFUND)
                .status(ReturnOrder.ReturnStatus.INSPECTING)
                .inventoryProcessed(false)
                .items(List.of(ReturnOrder.ReturnItem.builder()
                        .productId("product-1")
                        .variantId("variant-2")
                        .quantity(1)
                        .build()))
                .build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        ReturnOrder result = service.updateReturnStatus(
                "return-1",
                ReturnOrder.ReturnStatus.RECEIVED,
                null,
                ReturnOrder.InventoryDisposition.DISCARD);

        verify(returnInventoryClient).process(returnOrder, ReturnOrder.InventoryDisposition.DISCARD);
        assertThat(result.getInventoryProcessed()).isTrue();
        assertThat(result.getInventoryDisposition()).isEqualTo(ReturnOrder.InventoryDisposition.DISCARD);
    }

    @Test
    void deliveringReturnCannotBeManuallyMarkedAsReceived() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.DELIVERING);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        assertThatThrownBy(() -> service.updateReturnStatus(
                "return-1", ReturnOrder.ReturnStatus.RECEIVED, null, ReturnOrder.InventoryDisposition.RESTOCK))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Không thể chuyển");
        verify(returnInventoryClient, never()).process(any(), any());
    }

    @Test
    void deliveredReturnMustEnterInspectionBeforeInventoryDecision() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.DELIVERED);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        ReturnOrder result = service.updateReturnStatus(
                "return-1", ReturnOrder.ReturnStatus.INSPECTING, null, null);

        assertThat(result.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.INSPECTING);
        verify(returnInventoryClient, never()).process(any(), any());
    }

    @Test
    void warehouseIdentifiesWrongItemBeforeInventoryProcessing() {
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .orderId("order-1")
                .claimType(ReturnOrder.ClaimType.WRONG_ITEM)
                .resolution(ReturnOrder.ResolutionType.REFUND)
                .status(ReturnOrder.ReturnStatus.INSPECTING)
                .inventoryProcessed(false)
                .items(List.of(ReturnOrder.ReturnItem.builder()
                        .productId("expected-product")
                        .variantId("expected-variant")
                        .quantity(1)
                        .build()))
                .wrongItems(List.of())
                .build();
        WrongItemRequest actualItem = new WrongItemRequest(
                "actual-product", "actual-variant", "ACTUAL-SKU",
                "Actual product", "100 ml", 1);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        service.updateReturnStatus(
                "return-1",
                ReturnOrder.ReturnStatus.RECEIVED,
                null,
                ReturnOrder.InventoryDisposition.RESTOCK,
                null,
                List.of(actualItem));

        assertThat(returnOrder.getWrongItems()).singleElement().satisfies(item -> {
            assertThat(item.getProductId()).isEqualTo("actual-product");
            assertThat(item.getVariantId()).isEqualTo("actual-variant");
        });
        verify(returnInventoryClient).process(returnOrder, ReturnOrder.InventoryDisposition.RESTOCK);
    }

    @Test
    void wrongItemCannotEnterInventoryBeforeWarehouseIdentifiesSku() {
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .claimType(ReturnOrder.ClaimType.WRONG_ITEM)
                .status(ReturnOrder.ReturnStatus.INSPECTING)
                .inventoryProcessed(false)
                .items(List.of(ReturnOrder.ReturnItem.builder()
                        .productId("expected-product")
                        .variantId("expected-variant")
                        .quantity(1)
                        .build()))
                .build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        assertThatThrownBy(() -> service.updateReturnStatus(
                "return-1",
                ReturnOrder.ReturnStatus.RECEIVED,
                null,
                ReturnOrder.InventoryDisposition.RESTOCK,
                null,
                List.of()))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Kho cần xác định");
        verify(returnInventoryClient, never()).process(any(), any());
    }

    @Test
    void approvingReturnKeepsApprovalWhenGhnIsUnavailable() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.PENDING);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(deliveredOrder()));
        when(ghnService.createOrder(any())).thenThrow(new IllegalStateException("GHN unavailable"));
        ReturnOrder result = service.updateReturnStatus("return-1", ReturnOrder.ReturnStatus.DELIVERING, null, null);
        assertThat(result.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.DELIVERING);
        assertThat(result.getReturnTrackingCode()).isNull();
        assertThat(result.getReturnShipmentError()).contains("GHN đồng bộ");
        verify(returnOrderRepository).save(returnOrder);
    }

    @Test
    void pendingReturnCannotBeApprovedBeforeManagerReview() {
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .orderId("order-1")
                .claimType(ReturnOrder.ClaimType.RETURN)
                .status(ReturnOrder.ReturnStatus.PENDING)
                .build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        assertThatThrownBy(() -> service.updateReturnStatus(
                "return-1", ReturnOrder.ReturnStatus.DELIVERING, null, null))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("phải review");
        verify(orderRepository, never()).findById(any());
    }

    @Test
    void reviewReturnStoresReviewerAuditBeforeApproval() {
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .status(ReturnOrder.ReturnStatus.PENDING)
                .build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        ReturnOrder result = service.reviewReturn("return-1", "manager@skinguide.vn");

        assertThat(result.getReviewedBy()).isEqualTo("manager@skinguide.vn");
        assertThat(result.getReviewedAt()).isNotNull();
        verify(returnOrderRepository).save(returnOrder);
    }

    @Test
    void approverMustBeTheSameManagerWhoReviewedTheClaim() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.PENDING);
        returnOrder.setReviewedBy("manager-a");
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));

        assertThatThrownBy(() -> service.updateReturnStatus(
                "return-1",
                ReturnOrder.ReturnStatus.DELIVERING,
                null,
                null,
                null,
                null,
                "manager-b"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("chính là Admin/Manager đã review");
        verify(orderRepository, never()).findById(any());
    }

    @Test
    void pendingReturnCannotSkipApprovalAndWarehouseReceipt() {
        ReturnOrder returnOrder = returnOrder(ReturnOrder.ReturnStatus.PENDING);
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(returnOrder));
        assertThatThrownBy(() -> service.updateReturnStatus("return-1", ReturnOrder.ReturnStatus.REFUNDED, null, null)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("hoàn tiền qua yêu cầu hoàn tiền");
        verify(returnInventoryClient, never()).process(any(), any());
        verify(returnOrderRepository, never()).save(any());
    }

    @Test
    void missingItemRefundSkipsPhysicalReturnAndMovesToRefund() {
        ReturnOrder claim = ReturnOrder.builder()
                .id("return-1").orderId("order-1").orderCode("ORD-1")
                .claimType(ReturnOrder.ClaimType.MISSING_ITEM)
                .resolution(ReturnOrder.ResolutionType.REFUND)
                .status(ReturnOrder.ReturnStatus.PENDING)
                .reviewedBy("manager")
                .reviewedAt(LocalDateTime.now())
                .items(List.of(ReturnOrder.ReturnItem.builder().productId("product-1").quantity(1).build()))
                .build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(claim));

        ReturnOrder result = service.resolveReturn("return-1", ReturnOrder.ResolutionType.REFUND, null);

        assertThat(result.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.REFUND_PENDING);
        verify(returnInventoryClient, never()).process(any(), any());
        verify(compensationOrderRepository, never()).save(any());
    }

    @Test
    void missingItemRedeliveryCreatesOnlyOneCompensationOrder() {
        ReturnOrder claim = ReturnOrder.builder()
                .id("return-1").orderId("order-1").orderCode("ORD-1")
                .customerId("customer-1").customerName("Customer")
                .claimType(ReturnOrder.ClaimType.MISSING_ITEM)
                .resolution(ReturnOrder.ResolutionType.REDELIVER)
                .status(ReturnOrder.ReturnStatus.PENDING)
                .reviewedBy("manager")
                .reviewedAt(LocalDateTime.now())
                .items(List.of(ReturnOrder.ReturnItem.builder()
                        .productId("product-1").variantId("variant-1").quantity(1).build()))
                .build();
        when(returnOrderRepository.findById("return-1")).thenReturn(Optional.of(claim));
        when(compensationOrderRepository.findByReturnOrderId("return-1")).thenReturn(Optional.empty());

        service.resolveReturn("return-1", ReturnOrder.ResolutionType.REDELIVER, "Giao bù");
        service.resolveReturn("return-1", ReturnOrder.ResolutionType.REDELIVER, "Gọi lặp");

        assertThat(claim.getStatus()).isEqualTo(ReturnOrder.ReturnStatus.REDELIVERY_PENDING);
        verify(compensationOrderRepository, times(1)).save(any(CompensationOrder.class));
    }

    private ReturnRequest returnRequest() {
        return new ReturnRequest(ReturnOrder.ClaimType.RETURN, ReturnOrder.ResolutionType.REFUND,
                "Không phù hợp", "Sản phẩm gây kích ứng khi sử dụng",
                List.of("/api/orders/uploads/123e4567-e89b-12d3-a456-426614174000.jpg"),
                List.of(new ReturnItemRequest("product-1", "variant-2", "SKU-2", "100 ml", 1)),
                List.of());
    }

    private ReturnOrder returnOrder(ReturnOrder.ReturnStatus status) {
        return ReturnOrder.builder().id("return-1").orderId("order-1").orderCode("ORD-1")
                .claimType(ReturnOrder.ClaimType.RETURN).resolution(ReturnOrder.ResolutionType.REFUND)
                .status(status).inventoryProcessed(false)
                .reviewedBy("manager").reviewedAt(LocalDateTime.now())
                .items(List.of(ReturnOrder.ReturnItem.builder().productId("product-1").variantId("variant-2").sku("SKU-2").quantity(1).build())).build();
    }

    private Order deliveredOrder() {
        return Order.builder().id("order-1").orderCode("ORD-1").status(Order.OrderStatus.DELIVERED).paymentStatus(Order.PaymentStatus.PAID).items(List.of(orderItem("variant-1", "SKU-1", "50 ml"), orderItem("variant-2", "SKU-2", "100 ml"))).build();
    }

    private OrderItem orderItem(String variantId, String sku, String unit) {
        return OrderItem.builder().productId("product-1").variantId(variantId).sku(sku).variantName(unit).productName("Cleanser").unit(unit).quantity(2).unitPrice(BigDecimal.valueOf(100_000)).build();
    }
}


