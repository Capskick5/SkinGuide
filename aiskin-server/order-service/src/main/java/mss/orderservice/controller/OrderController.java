package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.dto.OrderResponse;
import mss.orderservice.service.DashboardService;
import mss.orderservice.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "Order Controller", description = "Endpoints for managing orders and payments")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final DashboardService dashboardService;

    @PostMapping
    @Operation(summary = "Create a new order", description = "Creates an order and returns payment URL if applicable")
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an order", description = "Customer cancels their order before it is processed")
    public ResponseEntity<?> cancelOrder(@PathVariable String id, @RequestBody Map<String, String> body) {
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
        
        // Note: In production, verify signature first!
        orderService.processMomoIpn(orderId, resultCode);
        
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/payment/vnpay-ipn")
    @Operation(summary = "VNPay IPN Callback", description = "Server-to-server callback for VNPay status")
    public ResponseEntity<?> vnpayIpn(@RequestParam Map<String, String> requestParams) {
        String orderId = requestParams.get("vnp_TxnRef");
        String responseCode = requestParams.get("vnp_ResponseCode");
        if (orderId != null && responseCode != null) {
            orderService.processVnpayIpn(orderId, responseCode);
        }
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

    @GetMapping("/{id}")
    @Operation(summary = "Get order details", description = "Fetch details of a specific order")
    public ResponseEntity<?> getOrderById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/{id}/payment-url")
    @Operation(summary = "Get payment URL for an existing order", description = "Generates a payment URL for an unpaid order (VNPAY/MOMO)")
    public ResponseEntity<?> getPaymentUrl(@PathVariable String id) {
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
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(orderService.getOrdersByCustomerId(customerId, page, size, status));
    }

    @GetMapping
    @Operation(summary = "Get all orders", description = "Admin endpoint to fetch all orders in the system with pagination and optional status filter")
    public ResponseEntity<?> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(orderService.getAllOrders(page, size, status));
    }

    @PutMapping("/{id}/status")
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
    @Operation(summary = "Dashboard tài chính", description = "Thống kê doanh thu, chi phí hoàn tiền, chi phí vận chuyển trả hàng")
    public ResponseEntity<?> getFinancialDashboard() {
        return ResponseEntity.ok(dashboardService.getFinancialSummary());
    }
}
