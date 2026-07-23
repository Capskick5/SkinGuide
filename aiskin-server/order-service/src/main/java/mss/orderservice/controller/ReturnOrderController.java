// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.ReturnRequest;
import mss.orderservice.dto.ReturnStatusUpdateRequest;
import mss.orderservice.dto.ReturnTrackingRequest;
import mss.orderservice.dto.ReturnResolutionRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.security.OrderAuthorizationService;
import mss.orderservice.service.impl.ReturnOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import mss.orderservice.security.IOrderAuthorizationService;
import mss.orderservice.service.ICompensationOrderService;
import mss.orderservice.service.IReturnOrderService;

@RestController
@RequestMapping("/api/returns")
@Tag(name = "Return Order Controller", description = "Endpoints for managing return requests")
@RequiredArgsConstructor
@Slf4j
public class ReturnOrderController {

    private final IReturnOrderService returnOrderService;

    private final ICompensationOrderService compensationOrderService;

    private final IOrderAuthorizationService authorizationService;

    @PostMapping("/order/{orderId}")
    @Operation(summary = "Create a return request", description = "Customer creates a return request for a delivered order")
    public ResponseEntity<ReturnOrder> createReturnRequest(@PathVariable String orderId, @Valid @RequestBody ReturnRequest request, Authentication authentication) {
        authorizationService.requireOrderAccess(orderId, authentication);
        return ResponseEntity.ok(returnOrderService.createReturnRequest(orderId, request));
    }

    @PostMapping("/compensation/{compensationOrderId}")
    @Operation(
            summary = "Create a complaint after redelivery",
            description = "Customer reports a problem with a delivered compensation order. The only resolution is bank-transfer refund.")
    public ResponseEntity<ReturnOrder> createCompensationReturnRequest(
            @PathVariable String compensationOrderId,
            @Valid @RequestBody ReturnRequest request,
            Authentication authentication) {
        var compensation = compensationOrderService.getById(compensationOrderId);
        authorizationService.requireReturnAccess(compensation.getReturnOrderId(), authentication);
        return ResponseEntity.ok(
                returnOrderService.createCompensationReturnRequest(compensationOrderId, request));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Get return by order ID", description = "Check if an order has a return request")
    public ResponseEntity<ReturnOrder> getReturnByOrderId(@PathVariable String orderId, Authentication authentication) {
        authorizationService.requireReturnByOrderAccess(orderId, authentication);
        ReturnOrder returnOrder = returnOrderService.getReturnByOrderId(orderId);
        if (returnOrder == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(returnOrder);
    }

    @GetMapping("/user/{customerId}")
    @Operation(summary = "Get returns by customer", description = "Fetch all return requests for a customer")
    public ResponseEntity<?> getReturnsByCustomer(@PathVariable String customerId, Authentication authentication) {
        authorizationService.requireSameCustomerOrAdmin(customerId, authentication);
        return ResponseEntity.ok(returnOrderService.getReturnsByCustomer(customerId));
    }

    @GetMapping
    @PreAuthorize("hasPermission('/api/returns', 'GET')")
    @Operation(summary = "Get all returns", description = "Admin endpoint to fetch all return requests with pagination and optional status filter")
    public ResponseEntity<?> getAllReturns(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(returnOrderService.getAllReturns(page, size, status));
    }

    @PutMapping("/admin/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER') and hasPermission('/api/returns/admin/{id}/status', 'PUT')")
    @Operation(summary = "Mark return request as reviewed", description = "Admin/Manager confirms the complaint details were reviewed before making an approval decision.")
    public ResponseEntity<ReturnOrder> reviewReturn(@PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(returnOrderService.reviewReturn(id, authentication.getName()));
    }

    @PutMapping("/admin/{id}/status")
    @PreAuthorize("hasPermission('/api/returns/admin/{id}/status', 'PUT')")
    @Operation(
            summary = "Update return status",
            description = "Admin manages approval and warehouse inspection. DELIVERING can only become DELIVERED through GHN. DELIVERED must enter INSPECTING before RECEIVED or INSPECTION_FAILED.")
    public ResponseEntity<ReturnOrder> updateReturnStatus(@PathVariable String id,
                                                          @Valid @RequestBody ReturnStatusUpdateRequest request,
                                                          Authentication authentication) {
        return ResponseEntity.ok(returnOrderService.updateReturnStatus(
                id,
                request.status(),
                request.rejectReason(),
                request.inventoryDisposition(),
                request.inspectionNote(),
                request.wrongItems(),
                authentication.getName()));
    }

    @PostMapping("/admin/{id}/resolve")
    @PreAuthorize("hasPermission('/api/returns/admin/{id}/resolve', 'POST')")
    @Operation(summary = "Resolve return", description = "Admin decides final resolution: REFUND or REDELIVER for missing/wrong item cases")
    public ResponseEntity<ReturnOrder> resolveReturn(@PathVariable String id,
                                                     @Valid @RequestBody ReturnResolutionRequest request,
                                                     Authentication authentication) {
        return ResponseEntity.ok(returnOrderService.resolveReturn(
                id, request.resolution(), request.note(), authentication.getName()));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a return request", description = "Customer updates an existing return request")
    public ResponseEntity<ReturnOrder> updateReturnRequest(@PathVariable String id, @Valid @RequestBody ReturnRequest request, Authentication authentication) {
        authorizationService.requireReturnAccess(id, authentication);
        return ResponseEntity.ok(returnOrderService.updateReturnRequest(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a return request", description = "Customer deletes an existing return request")
    public ResponseEntity<Void> deleteReturnRequest(@PathVariable String id, Authentication authentication) {
        authorizationService.requireReturnAccess(id, authentication);
        returnOrderService.deleteReturnRequest(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/tracking")
    @Operation(summary = "Update return tracking", description = "Customer updates tracking info for their return package")
    public ResponseEntity<ReturnOrder> updateReturnTracking(@PathVariable String id, @Valid @RequestBody ReturnTrackingRequest request, Authentication authentication) {
        authorizationService.requireReturnAccess(id, authentication);
        return ResponseEntity.ok(returnOrderService.updateReturnTracking(id, request.courier(), request.trackingCode()));
    }

    @PostMapping("/sync-ghn")
    @PreAuthorize("hasPermission('/api/returns/sync-ghn', 'POST')")
    @Operation(summary = "Đồng bộ GHN thủ công", description = "Đồng bộ trạng thái toàn bộ đơn trả hàng từ GHN")
    public ResponseEntity<?> syncGhnReturnOrderStatusManual() {
        try {
            returnOrderService.syncGhnReturnOrderStatus();
            compensationOrderService.syncGhnCompensationOrderStatus();
            return ResponseEntity.ok(Map.of("message", "Đồng bộ thành công"));
        } catch (Exception exception) {
            log.error("Failed to synchronize GHN return and redelivery statuses", exception);
            return ResponseEntity.internalServerError().body(Map.of("message", "Không thể đồng bộ trạng thái GHN"));
        }
    }
}
