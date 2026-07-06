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

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Get return by order ID", description = "Check if an order has a return request")
    public ResponseEntity<ReturnOrder> getReturnByOrderId(@PathVariable String orderId) {
        ReturnOrder returnOrder = returnOrderService.getReturnByOrderId(orderId);
        if (returnOrder == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(returnOrder);
    }

    @GetMapping("/user/{customerId}")
    @Operation(summary = "Get returns by customer", description = "Fetch all return requests for a customer")
    public ResponseEntity<?> getReturnsByCustomer(@PathVariable String customerId) {
        return ResponseEntity.ok(returnOrderService.getReturnsByCustomer(customerId));
    }

    @GetMapping
    @Operation(summary = "Get all returns", description = "Admin endpoint to fetch all return requests with pagination and optional status filter")
    public ResponseEntity<?> getAllReturns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(returnOrderService.getAllReturns(page, size, status));
    }

    @PutMapping("/admin/{id}/status")
    @Operation(summary = "Update return status", description = "Admin updates status of a return request")
    public ResponseEntity<ReturnOrder> updateReturnStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        String rejectReason = body.get("rejectReason");
        if (newStatus == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(returnOrderService.updateReturnStatus(id, newStatus, rejectReason));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a return request", description = "Customer updates an existing return request")
    public ResponseEntity<ReturnOrder> updateReturnRequest(
            @PathVariable String id,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(returnOrderService.updateReturnRequest(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a return request", description = "Customer deletes an existing return request")
    public ResponseEntity<Void> deleteReturnRequest(@PathVariable String id) {
        returnOrderService.deleteReturnRequest(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/tracking")
    @Operation(summary = "Update return tracking", description = "Customer updates tracking info for their return package")
    public ResponseEntity<ReturnOrder> updateReturnTracking(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String courier = body.get("courier");
        String trackingCode = body.get("trackingCode");
        if (courier == null || trackingCode == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(returnOrderService.updateReturnTracking(id, courier, trackingCode));
    }

    @PostMapping("/sync-ghn")
    @Operation(summary = "Đồng bộ GHN thủ công", description = "Đồng bộ trạng thái toàn bộ đơn trả hàng từ GHN")
    public ResponseEntity<?> syncGhnReturnOrderStatusManual() {
        try {
            returnOrderService.syncGhnReturnOrderStatus();
            return ResponseEntity.ok(Map.of("message", "Đồng bộ thành công"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Lỗi đồng bộ: " + e.getMessage()));
        }
    }
}
