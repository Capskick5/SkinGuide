package mss.orderservice.controller;

import mss.orderservice.dto.PaymentProcessingResult;
import mss.orderservice.model.Order;
import mss.orderservice.security.OrderAuthorizationService;
import mss.orderservice.service.DashboardService;
import mss.orderservice.service.OrderService;
import mss.orderservice.service.PaymentConfigurationValidator;
import mss.orderservice.service.PaymentWebhookVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrderControllerPaymentTest {

    private OrderService orderService;
    private PaymentWebhookVerifier verifier;
    private OrderController controller;

    @BeforeEach
    void setUp() {
        orderService = mock(OrderService.class);
        verifier = mock(PaymentWebhookVerifier.class);
        controller = new OrderController(
                orderService,
                mock(DashboardService.class),
                mock(OrderAuthorizationService.class),
                verifier,
                mock(PaymentConfigurationValidator.class));
    }

    @Test
    void vnpayRejectsInvalidSignatureUsingProviderResponseContract() {
        Map<String, String> payload = validVnpayPayload();
        when(verifier.verifyVnpay(payload)).thenReturn(false);

        var response = controller.vnpayIpn(payload);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(body(response.getBody())).containsEntry("RspCode", "97");
    }

    @Test
    void vnpayReturnsPaidStatusOnlyAfterBackendProcessesBothSuccessCodes() {
        Map<String, String> payload = validVnpayPayload();
        when(verifier.verifyVnpay(payload)).thenReturn(true);
        when(orderService.processVnpayIpn(anyString(), anyString(), anyString(), anyLong(), anyString()))
                .thenReturn(new PaymentProcessingResult(Order.PaymentStatus.PAID, false));

        var response = controller.vnpayIpn(payload);

        assertThat(body(response.getBody()))
                .containsEntry("RspCode", "00")
                .containsEntry("paymentStatus", "PAID");
    }

    @Test
    void vnpayMapsAmountMismatchToOfficialResponseCode() {
        Map<String, String> payload = validVnpayPayload();
        when(verifier.verifyVnpay(payload)).thenReturn(true);
        when(orderService.processVnpayIpn(anyString(), anyString(), anyString(), anyLong(), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số tiền thanh toán không khớp đơn hàng"));

        var response = controller.vnpayIpn(payload);

        assertThat(body(response.getBody())).containsEntry("RspCode", "04");
    }

    @Test
    void momoBrowserReturnUsesPersistedPaymentStatus() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", "ORD-1");
        payload.put("resultCode", 0);
        payload.put("amount", 130_000);
        payload.put("transId", "MOMO-TXN-1");
        when(verifier.verifyMomo(payload)).thenReturn(true);
        when(orderService.processMomoIpn("ORD-1", 0, 130_000, "MOMO-TXN-1"))
                .thenReturn(new PaymentProcessingResult(Order.PaymentStatus.PAID, false));

        var response = controller.momoReturn(payload);

        assertThat(body(response.getBody()))
                .containsEntry("paymentStatus", "PAID")
                .containsEntry("confirmed", true);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> body(Object responseBody) {
        return (Map<String, Object>) responseBody;
    }

    private Map<String, String> validVnpayPayload() {
        Map<String, String> payload = new HashMap<>();
        payload.put("vnp_TxnRef", "ORD-1");
        payload.put("vnp_ResponseCode", "00");
        payload.put("vnp_TransactionStatus", "00");
        payload.put("vnp_TransactionNo", "VNP-TXN-1");
        payload.put("vnp_Amount", "13000000");
        payload.put("vnp_SecureHash", "signed");
        return payload;
    }
}
