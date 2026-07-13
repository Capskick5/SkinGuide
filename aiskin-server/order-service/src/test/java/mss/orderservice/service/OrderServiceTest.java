package mss.orderservice.service;

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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
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
    private final GhnService ghnService = mock(GhnService.class);
    private OrderService service;
    private MockRestServiceServer inventoryServer;

    @BeforeEach
    void setUp() {
        service = new OrderService(
                orderRepository,
                new MomoConfig(),
                new VnpayConfig(),
                ghnService,
                "http://product-service",
                "internal-token");
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        inventoryServer = MockRestServiceServer.bindTo(restTemplate).build();
        when(ghnService.calculateFee(3695, "90753", 500, 2)).thenReturn(Map.of("total", 30_000));
    }

    @Test
    void ignoresClientPriceAndShippingFeeAndPersistsTrustedTotals() {
        when(orderRepository.findByCustomerIdAndIdempotencyKey("user-1", "key-1"))
                .thenReturn(Optional.empty());
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
        when(orderRepository.findByCustomerIdAndIdempotencyKey("user-1", "key-1"))
                .thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenThrow(new IllegalStateException("database unavailable"));
        expectInventory("reserve");
        expectInventory("release");

        assertThatThrownBy(() -> service.createOrder(request(), "key-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("database unavailable");
        inventoryServer.verify();
    }

    @Test
    void returnsExistingOrderForRepeatedIdempotencyKey() {
        Order existing = Order.builder()
                .orderCode("ORD-EXISTING")
                .customerId("user-1")
                .idempotencyKey("key-1")
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(Order.PaymentMethod.COD)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .build();
        when(orderRepository.findByCustomerIdAndIdempotencyKey("user-1", "key-1"))
                .thenReturn(Optional.of(existing));

        assertThat(service.createOrder(request(), "key-1").getOrderCode()).isEqualTo("ORD-EXISTING");
        verify(orderRepository, times(0)).save(any());
    }

    private void expectInventory(String action) {
        inventoryServer.expect(requestTo("http://product-service/api/products/inventory/internal/" + action))
                .andRespond(withSuccess("""
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
