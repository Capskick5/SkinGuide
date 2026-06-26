package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.dto.OrderResponse;
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

    @PostMapping
    @Operation(summary = "Create a new order", description = "Creates an order and returns payment URL if applicable")
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PostMapping("/payment/momo-ipn")
    @Operation(summary = "MoMo IPN Callback", description = "Server-to-server callback for Momo payment status")
    public ResponseEntity<?> momoIpn(@RequestBody Map<String, Object> requestBody) {
        String orderId = (String) requestBody.get("orderId");
        Integer resultCode = (Integer) requestBody.get("resultCode");
        
        // Note: In production, verify signature first!
        orderService.processMomoIpn(orderId, resultCode);
        
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{customerId}")
    @Operation(summary = "Get orders by customer", description = "Fetch all orders for a given customer id")
    public ResponseEntity<?> getOrdersByCustomer(@PathVariable String customerId) {
        return ResponseEntity.ok(orderService.getOrdersByCustomerId(customerId));
    }
}
