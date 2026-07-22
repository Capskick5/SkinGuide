package mss.orderservice.service.impl;
import mss.orderservice.service.*;


import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.VnpayConfig;
import mss.orderservice.dto.OrderItemRequest;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.model.Order;
import mss.orderservice.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OrderServiceTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);

    private final IGhnService ghnService = mock(GhnService.class);

    private final IVoucherService voucherService = mock(IVoucherService.class);

    private IOrderService service;

    private MockRestServiceServer inventoryServer;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        MomoConfig momoConfig = new MomoConfig();
        VnpayConfig vnpayConfig = new VnpayConfig();
        service = createService(restTemplate, false);
        inventoryServer = MockRestServiceServer.bindTo(restTemplate).build();
        when(ghnService.calculateFee(3695, "90753", 500, 2)).thenReturn(Map.of("total", 30_000));
    }

    @Test
    void ignoresClientPriceAndShippingFeeAndPersistsTrustedTotals() {
        when(orderRepository.findByCustomerIdAndIdempotencyKey("user-1", "key-1")).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        expectInventory("reserve");
        service.createOrder(request(), "key-1");
        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        Order saved = captor.getValue();
        assertThat(saved.getShippingFee()).isEqualByComparingTo("30000");
        assertThat(saved.getItems().getFirst().getUnitPrice()).isEqualByComparingTo("100000");
        assertThat(saved.getTotalAmount()).isEqualByComparingTo("130000");
        assertThat(saved.getIdempotencyKey()).isEqualTo("key-1");
        inventoryServer.verify();
    }

    @Test
    void releasesReservationWhenSavingOrderFails() {
        when(orderRepository.findByCustomerIdAndIdempotencyKey("user-1", "key-1")).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenThrow(new IllegalStateException("database unavailable"));
        expectInventory("reserve");
        expectInventory("release");
        assertThatThrownBy(() -> service.createOrder(request(), "key-1")).isInstanceOf(IllegalStateException.class).hasMessage("database unavailable");
        inventoryServer.verify();
    }

    @Test
    void releasesVoucherAndReservationWhenSavingDiscountedOrderFails() {
        OrderRequest request = request();
        request.setVoucherCode("SAVE10");
        when(orderRepository.findByCustomerIdAndIdempotencyKey("user-1", "key-1"))
                .thenReturn(Optional.empty());
        when(voucherService.validateAndCalculateDiscount("SAVE10", BigDecimal.valueOf(100_000)))
                .thenReturn(BigDecimal.valueOf(10_000));
        when(orderRepository.save(any(Order.class)))
                .thenThrow(new IllegalStateException("database unavailable"));
        expectInventory("reserve");
        expectInventory("release");

        assertThatThrownBy(() -> service.createOrder(request, "key-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("database unavailable");

        verify(voucherService).incrementUsage("SAVE10");
        verify(voucherService).releaseUsage("SAVE10");
        inventoryServer.verify();
    }

    @Test
    void returnsExistingOrderForRepeatedIdempotencyKey() {
        Order existing = Order.builder().orderCode("ORD-EXISTING").customerId("user-1").idempotencyKey("key-1").status(Order.OrderStatus.PENDING).paymentMethod(Order.PaymentMethod.COD).paymentStatus(Order.PaymentStatus.UNPAID).build();
        when(orderRepository.findByCustomerIdAndIdempotencyKey("user-1", "key-1")).thenReturn(Optional.of(existing));
        assertThat(service.createOrder(request(), "key-1").getOrderCode()).isEqualTo("ORD-EXISTING");
        verify(orderRepository, times(0)).save(any());
    }

    @Test
    void rejectsPaymentCallbackFromWrongProvider() {
        Order order = onlineOrder(Order.PaymentMethod.VNPAY);
        when(orderRepository.findByOrderCode("ORD-ONLINE")).thenReturn(Optional.of(order));
        assertThatThrownBy(() -> service.processMomoIpn("ORD-ONLINE", 0, 130_000, "TXN-1")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("Callback không đúng phương thức");
    }

    @Test
    void rejectsPaymentCallbackForUnknownOrder() {
        when(orderRepository.findByOrderCode("ORD-MISSING")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.processVnpayIpn("ORD-MISSING", "00", "00", 13_000_000, "TXN-1")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("Không tìm thấy đơn thanh toán");
    }

    @Test
    void rejectsBankTransferSimulationWhenFeatureIsDisabled() {
        assertThatThrownBy(() -> service.simulateBankTransfer("ORD-ONLINE"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("simulation is disabled");
        verify(orderRepository, times(0)).findByOrderCode(any());
    }

    @Test
    void confirmsBankTransferSimulationWhenFeatureIsEnabled() {
        RestTemplate restTemplate = new RestTemplate();
        service = createService(restTemplate, true);
        Order order = onlineOrder(Order.PaymentMethod.BANK_TRANSFER);
        when(orderRepository.findByOrderCode("ORD-ONLINE")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.simulateBankTransfer("ORD-ONLINE");

        assertThat(result.paymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(order.getPaymentTransactionId()).startsWith("SIMULATED-");
        verify(orderRepository).save(order);
    }

    @Test
    void rejectsPaymentUrlAfterReservationExpired() {
        Order order = onlineOrder(Order.PaymentMethod.VNPAY);
        order.setId("order-id");
        order.setReservationExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(orderRepository.findById("order-id")).thenReturn(Optional.of(order));
        assertThatThrownBy(() -> service.getPaymentUrlForOrder("order-id")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("hết thời gian thanh toán");
    }

    @Test
    void rejectsUnavailableOnlineMethodBeforeReservingInventory() {
        OrderRequest request = request();
        request.setPaymentMethod(Order.PaymentMethod.VNPAY);
        assertThatThrownBy(() -> service.createOrder(request, "key-1")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("VNPay chưa được cấu hình");
        verify(orderRepository, times(0)).save(any());
        inventoryServer.verify();
    }

    @Test
    void vnpaySuccessRequiresBothSuccessCodesAndRecordsAuditData() {
        Order order = onlineOrder(Order.PaymentMethod.VNPAY);
        when(orderRepository.findByOrderCode("ORD-ONLINE")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.processVnpayIpn("ORD-ONLINE", "00", "00", 13_000_000, "VNP-TXN-1");
        assertThat(result.paymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(result.alreadyProcessed()).isFalse();
        assertThat(order.getStatus()).isEqualTo(Order.OrderStatus.PROCESSING);
        assertThat(order.getPaymentTransactionId()).isEqualTo("VNP-TXN-1");
        assertThat(order.getPaidAt()).isNotNull();
        verify(orderRepository).save(order);
    }

    @Test
    void vnpayDoesNotAcceptResponseCodeAloneAsSuccess() {
        Order order = onlineOrder(Order.PaymentMethod.VNPAY);
        when(orderRepository.findByOrderCode("ORD-ONLINE")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        expectInventory("release");
        var result = service.processVnpayIpn("ORD-ONLINE", "00", "02", 13_000_000, "VNP-TXN-1");
        assertThat(result.paymentStatus()).isEqualTo(Order.PaymentStatus.FAILED);
        assertThat(order.getStatus()).isEqualTo(Order.OrderStatus.CANCELLED);
        assertThat(order.getInventoryReserved()).isFalse();
        inventoryServer.verify();
    }

    @Test
    void repeatedSuccessfulCallbackDoesNotWriteOrderTwice() {
        Order order = onlineOrder(Order.PaymentMethod.MOMO);
        order.setPaymentStatus(Order.PaymentStatus.PAID);
        order.setPaymentTransactionId("MOMO-TXN-1");
        when(orderRepository.findByOrderCode("ORD-ONLINE")).thenReturn(Optional.of(order));
        var result = service.processMomoIpn("ORD-ONLINE", 0, 130_000, "MOMO-TXN-1");
        assertThat(result.alreadyProcessed()).isTrue();
        assertThat(result.paymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        verify(orderRepository, times(0)).save(any());
    }

    @Test
    void rejectsOversizedOrderPage() {
        assertThatThrownBy(() -> service.getAllOrders(0, 101, "ALL")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("Phân trang không hợp lệ");
        verify(orderRepository, times(0)).findAllByOrderByCreatedAtDesc(any());
    }

    private Order onlineOrder(Order.PaymentMethod paymentMethod) {
        return Order.builder().orderCode("ORD-ONLINE").customerId("user-1").status(Order.OrderStatus.PENDING).paymentMethod(paymentMethod).paymentStatus(Order.PaymentStatus.UNPAID).inventoryReserved(true).inventoryCommitted(false).reservationExpiresAt(LocalDateTime.now().plusMinutes(15)).totalAmount(BigDecimal.valueOf(130_000)).items(List.of()).build();
    }

    @Test
    void rejectsSuccessfulCallbackAfterReservationExpired() {
        Order order = onlineOrder(Order.PaymentMethod.VNPAY);
        order.setReservationExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(orderRepository.findByOrderCode("ORD-ONLINE")).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.processVnpayIpn(
                "ORD-ONLINE", "00", "00", 13_000_000, "VNP-TXN-LATE"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("hết hạn");
        verify(orderRepository, times(0)).save(any());
    }

    private IOrderService createService(RestTemplate restTemplate, boolean bankTransferSimulationEnabled) {
        MomoConfig momoConfig = new MomoConfig();
        VnpayConfig vnpayConfig = new VnpayConfig();
        return new OrderService(orderRepository, momoConfig, vnpayConfig, ghnService,
                new PaymentConfigurationValidator(momoConfig, vnpayConfig), voucherService, restTemplate,
                "http://product-service", "internal-token", bankTransferSimulationEnabled);
    }

    private void expectInventory(String action) {
        inventoryServer.expect(requestTo("http://product-service/api/products/inventory/internal/" + action)).andRespond(withSuccess("""
            {"success":true,"data":{"orderCode":"ORD-1","totalAmount":100000,
            "items":[{"productId":"product-1","variantId":"variant-1","productName":"Cleanser",
            "variantName":"100ml","sku":"SKU-1","unit":"chai","quantity":1,
            "unitPrice":100000,"subTotal":100000}]}}
            """, MediaType.APPLICATION_JSON));
    }

    private OrderRequest request() {
        OrderItemRequest item = new OrderItemRequest();
        item.setProductId("product-1");
        item.setVariantId("variant-1");
        item.setQuantity(1);
        item.setUnitPrice(BigDecimal.ONE);
        OrderRequest request = new OrderRequest();
        request.setCustomerId("user-1");
        request.setCustomerName("Customer");
        request.setCustomerPhone("0900000000");
        request.setShippingAddress("FPT University");
        request.setGhnDistrictId(3695);
        request.setGhnWardCode("90753");
        request.setShippingFee(BigDecimal.ONE);
        request.setPaymentMethod(Order.PaymentMethod.COD);
        request.setItems(List.of(item));
        return request;
    }
}


