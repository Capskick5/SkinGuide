package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.dto.OrderResponse;
import mss.orderservice.service.DashboardService;
import mss.orderservice.service.OrderService;
import mss.orderservice.service.PaymentWebhookVerifier;
import mss.orderservice.security.OrderAuthorizationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
        try {
            return ResponseEntity.ok(orderService.cancelOrder(id, reason));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/payment/momo-ipn")
    @Operation(summary = "MoMo IPN Callback", description = "Server-to-server callback for Momo payment status")
    public ResponseEntity<?> momoIpn(@RequestBody Map<String, Object> requestBody) {
        String orderId = (String) requestBody.get("orderId");
        Integer resultCode = parseResultCode(requestBody.get("resultCode"));

        if (orderId == null || resultCode == null) {
            return ResponseEntity.badRequest().body("orderId and resultCode are required");
        }
        if (!paymentWebhookVerifier.verifyMomo(requestBody)) {
            return ResponseEntity.status(401).body("Invalid MoMo signature");
        }
        Long amount = parseLong(requestBody.get("amount"));
        if (amount == null) {
            return ResponseEntity.badRequest().body("amount is required");
        }
        orderService.processMomoIpn(orderId, resultCode, amount);
        
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/payment/vnpay-ipn")
    @Operation(summary = "VNPay IPN Callback", description = "Server-to-server callback for VNPay status")
    public ResponseEntity<?> vnpayIpn(@RequestParam Map<String, String> requestParams) {
        String orderId = requestParams.get("vnp_TxnRef");
        String responseCode = requestParams.get("vnp_ResponseCode");
        if (orderId == null || responseCode == null || !paymentWebhookVerifier.verifyVnpay(requestParams)) {
            return ResponseEntity.status(401).body("{\"RspCode\":\"97\",\"Message\":\"Invalid signature\"}");
        }
        Long amount = parseLong(requestParams.get("vnp_Amount"));
        if (amount == null) {
            return ResponseEntity.badRequest().body("{\"RspCode\":\"01\",\"Message\":\"Invalid amount\"}");
        }
        orderService.processVnpayIpn(orderId, responseCode, amount);
        return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
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
        try {
            String paymentUrl = orderService.getPaymentUrlForOrder(id);
            return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
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
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all orders", description = "Admin endpoint to fetch all orders in the system with pagination and optional status filter")
    public ResponseEntity<?> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(orderService.getAllOrders(page, size, status));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
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
        try {
            return ResponseEntity.ok(orderService.updateOrderStatus(id, newStatus, cancelReason, weight, length, width, height, requiredNote));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
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
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Đồng bộ GHN thủ công", description = "Đồng bộ trạng thái toàn bộ đơn hàng từ GHN")
    public ResponseEntity<?> syncGhnOrderStatusManual() {
        try {
            orderService.syncGhnOrderStatus();
            return ResponseEntity.ok(Map.of("message", "Đồng bộ thành công"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Lỗi đồng bộ: " + e.getMessage()));
        }
    }

    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Dashboard tài chính", description = "Thống kê doanh thu, chi phí hoàn tiền, chi phí vận chuyển trả hàng")
    public ResponseEntity<?> getFinancialDashboard() {
        return ResponseEntity.ok(dashboardService.getFinancialSummary());
    }
}
