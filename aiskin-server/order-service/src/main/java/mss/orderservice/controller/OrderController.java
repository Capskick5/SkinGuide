package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.dto.OrderResponse;
import mss.orderservice.dto.PaymentProcessingResult;
import mss.orderservice.model.Order;
import mss.orderservice.service.DashboardService;
import mss.orderservice.service.OrderService;
import mss.orderservice.service.PaymentConfigurationValidator;
import mss.orderservice.service.PaymentWebhookVerifier;
import mss.orderservice.security.OrderAuthorizationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "Order Controller", description = "Endpoints for managing orders and payments")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final DashboardService dashboardService;
    private final OrderAuthorizationService authorizationService;
    private final PaymentWebhookVerifier paymentWebhookVerifier;
    private final PaymentConfigurationValidator paymentConfigurationValidator;

    @PostMapping
    @Operation(summary = "Create a new order", description = "Creates an order and returns payment URL if applicable")
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody OrderRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Authentication authentication) {
        if (idempotencyKey.isBlank() || idempotencyKey.length() > 100) {
            return ResponseEntity.badRequest().build();
        }
        request.setCustomerId(authentication.getName());
        return ResponseEntity.ok(orderService.createOrder(request, idempotencyKey));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an order", description = "Customer cancels their order before it is processed")
    public ResponseEntity<?> cancelOrder(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        authorizationService.requireOrderAccess(id, authentication);
        String reason = body.get("cancelReason");
        return ResponseEntity.ok(orderService.cancelOrder(id, reason));
    }

    @PostMapping("/{id}/payment/simulate-bank-transfer")
    @Operation(summary = "Simulate Bank Transfer Payment", description = "For development/testing. Simulates receiving money via bank transfer.")
    public ResponseEntity<?> simulateBankTransfer(
            @PathVariable String id,
            Authentication authentication) {
        authorizationService.requireOrderAccess(id, authentication);
        PaymentProcessingResult result = orderService.simulateBankTransfer(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/payment/momo-ipn")
    @Operation(summary = "MoMo IPN Callback", description = "Server-to-server callback for Momo payment status")
    public ResponseEntity<?> momoIpn(@RequestBody Map<String, Object> requestBody) {
        processMomoNotification(requestBody);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/payment/methods")
    @Operation(summary = "Get payment method availability")
    public ResponseEntity<?> getPaymentMethods() {
        return ResponseEntity.ok(Map.of(
                "COD", true,
                "BANK_TRANSFER", true,
                "MOMO", paymentConfigurationValidator.isMomoConfigured(),
                "VNPAY", paymentConfigurationValidator.isVnpayConfigured()));
    }

    @PostMapping("/payment/momo-return")
    @Operation(summary = "Verify MoMo browser return", description = "Verifies signed redirect data before showing payment result")
    public ResponseEntity<?> momoReturn(@RequestBody Map<String, Object> requestBody) {
        String orderCode = stringValue(requestBody.get("orderId"));
        PaymentProcessingResult result = processMomoNotification(requestBody);
        return ResponseEntity.ok(paymentReturnBody(orderCode, result));
    }
    
    @GetMapping("/payment/vnpay-ipn")
    @Operation(summary = "VNPay IPN Callback", description = "Server-to-server callback for VNPay status")
    public ResponseEntity<?> vnpayIpn(@RequestParam Map<String, String> requestParams) {
        String orderId = requestParams.get("vnp_TxnRef");
        String responseCode = requestParams.get("vnp_ResponseCode");
        String transactionStatus = requestParams.get("vnp_TransactionStatus");
        if (orderId == null
                || responseCode == null
                || transactionStatus == null
                || !paymentWebhookVerifier.verifyVnpay(requestParams)) {
            return ResponseEntity.ok(vnpayResponse("97", "Invalid signature", null));
        }
        Long amount = parseLong(requestParams.get("vnp_Amount"));
        if (amount == null) {
            return ResponseEntity.ok(vnpayResponse("04", "Invalid amount", null));
        }
        try {
            PaymentProcessingResult result = orderService.processVnpayIpn(
                    orderId,
                    responseCode,
                    transactionStatus,
                    amount,
                    requestParams.get("vnp_TransactionNo"));
            String rspCode = result.alreadyProcessed() ? "02" : "00";
            String message = result.alreadyProcessed() ? "Order already confirmed" : "Confirm Success";
            return ResponseEntity.ok(vnpayResponse(rspCode, message, result));
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == 404) {
                return ResponseEntity.ok(vnpayResponse("01", "Order not found", null));
            }
            if (exception.getStatusCode().value() == 400
                    && exception.getReason() != null
                    && exception.getReason().contains("Số tiền")) {
                return ResponseEntity.ok(vnpayResponse("04", "Invalid amount", null));
            }
            if (exception.getStatusCode().value() == 409) {
                return ResponseEntity.ok(vnpayResponse("02", "Order cannot be updated", null));
            }
            return ResponseEntity.ok(vnpayResponse("99", "Unknown error", null));
        }
    }

    private PaymentProcessingResult processMomoNotification(Map<String, Object> requestBody) {
        String orderId = stringValue(requestBody.get("orderId"));
        Integer resultCode = parseResultCode(requestBody.get("resultCode"));
        Long amount = parseLong(requestBody.get("amount"));
        if (orderId == null || resultCode == null || amount == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "orderId, resultCode và amount là bắt buộc");
        }
        if (!paymentWebhookVerifier.verifyMomo(requestBody)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chữ ký MoMo không hợp lệ");
        }
        return orderService.processMomoIpn(
                orderId,
                resultCode,
                amount,
                stringValue(requestBody.get("transId")));
    }

    private Map<String, Object> paymentReturnBody(String orderCode, PaymentProcessingResult result) {
        return Map.of(
                "orderCode", orderCode,
                "paymentStatus", result.paymentStatus().name(),
                "confirmed", result.paymentStatus() == Order.PaymentStatus.PAID
                        || result.paymentStatus() == Order.PaymentStatus.REFUNDED);
    }

    private Map<String, Object> vnpayResponse(
            String rspCode,
            String message,
            PaymentProcessingResult result) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("RspCode", rspCode);
        response.put("Message", message);
        if (result != null) {
            response.put("paymentStatus", result.paymentStatus().name());
        }
        return response;
    }

    private String stringValue(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        return value.toString();
    }

    private Integer parseResultCode(Object value) {
        if (value instanceof Integer resultCode) {
            return resultCode;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text) {
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Long parseLong(Object value) {
        try {
            return value == null ? null : Long.parseLong(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order details", description = "Fetch details of a specific order")
    public ResponseEntity<?> getOrderById(@PathVariable String id, Authentication authentication) {
        authorizationService.requireOrderAccess(id, authentication);
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/{id}/payment-url")
    @Operation(summary = "Get payment URL for an existing order", description = "Generates a payment URL for an unpaid order (VNPAY/MOMO)")
    public ResponseEntity<?> getPaymentUrl(@PathVariable String id, Authentication authentication) {
        authorizationService.requireOrderAccess(id, authentication);
        String paymentUrl = orderService.getPaymentUrlForOrder(id);
        return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
    }

    @GetMapping("/user/{customerId}")
    @Operation(summary = "Get orders by customer", description = "Fetch all orders for a given customer id with pagination")
    public ResponseEntity<?> getOrdersByCustomer(
            @PathVariable String customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            Authentication authentication) {
        authorizationService.requireSameCustomerOrAdmin(customerId, authentication);
        return ResponseEntity.ok(orderService.getOrdersByCustomerId(customerId, page, size, status));
    }

    @GetMapping
    @PreAuthorize("hasPermission('/api/orders', 'GET')")
    @Operation(summary = "Get all orders", description = "Admin endpoint to fetch all orders in the system with pagination and optional status filter")
    public ResponseEntity<?> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(orderService.getAllOrders(page, size, status));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasPermission('/api/orders/{id}/status', 'PUT')")
    @Operation(summary = "Update order status", description = "Admin endpoint to update the status of an order")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        String cancelReason = body.get("cancelReason");
        String requiredNote = body.get("requiredNote");
        
        Integer weight = parseInteger(body.get("weight"));
        Integer length = parseInteger(body.get("length"));
        Integer width = parseInteger(body.get("width"));
        Integer height = parseInteger(body.get("height"));
        
        if (newStatus == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status is required"));
        }
        return ResponseEntity.ok(orderService.updateOrderStatus(
                id, newStatus, cancelReason, weight, length, width, height, requiredNote));
    }

    private Integer parseInteger(String value) {
        if (value != null && !value.trim().isEmpty()) {
            try {
                return Integer.parseInt(value);
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    @PostMapping("/sync-ghn")
    @PreAuthorize("hasPermission('/api/orders/sync-ghn', 'POST')")
    @Operation(summary = "Đồng bộ GHN thủ công", description = "Đồng bộ trạng thái toàn bộ đơn hàng từ GHN")
    public ResponseEntity<?> syncGhnOrderStatusManual() {
        orderService.syncGhnOrderStatus();
        return ResponseEntity.ok(Map.of("message", "Đồng bộ thành công"));
    }

    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasPermission('/api/orders/admin/dashboard', 'GET')")
    @Operation(summary = "Dashboard tài chính", description = "Thống kê doanh thu, chi phí hoàn tiền, chi phí vận chuyển trả hàng")
    public ResponseEntity<?> getFinancialDashboard() {
        return ResponseEntity.ok(dashboardService.getFinancialSummary());
    }
}
