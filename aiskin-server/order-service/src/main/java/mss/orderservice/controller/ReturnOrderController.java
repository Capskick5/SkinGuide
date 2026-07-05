package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.service.ReturnOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/returns")
@Tag(name = "Return Order Controller", description = "Endpoints for managing return requests")
@RequiredArgsConstructor
public class ReturnOrderController {

    private final ReturnOrderService returnOrderService;

    @PostMapping("/order/{orderId}")
    @Operation(summary = "Create a return request", description = "Customer creates a return request for a delivered order")
    public ResponseEntity<ReturnOrder> createReturnRequest(
            @PathVariable String orderId,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(returnOrderService.createReturnRequest(orderId, request));
    }

    @GetMapping("/user/{customerId}")
    @Operation(summary = "Get returns by customer", description = "Fetch all return requests for a customer")
    public ResponseEntity<?> getReturnsByCustomer(@PathVariable String customerId) {
        return ResponseEntity.ok(returnOrderService.getReturnsByCustomer(customerId));
    }

    @GetMapping
    @Operation(summary = "Get all returns", description = "Admin endpoint to fetch all return requests")
    public ResponseEntity<?> getAllReturns() {
        return ResponseEntity.ok(returnOrderService.getAllReturns());
    }

    @PutMapping("/admin/{id}/status")
    @Operation(summary = "Update return status", description = "Admin updates status of a return request")
    public ResponseEntity<ReturnOrder> updateReturnStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(returnOrderService.updateReturnStatus(id, newStatus));
    }
}
