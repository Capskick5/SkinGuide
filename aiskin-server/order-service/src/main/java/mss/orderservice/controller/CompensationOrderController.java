package mss.orderservice.controller;

import lombok.RequiredArgsConstructor;
import mss.orderservice.model.CompensationOrder;
import mss.orderservice.service.ICompensationOrderService;
import mss.orderservice.security.IOrderAuthorizationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/compensations")
@RequiredArgsConstructor
public class CompensationOrderController {
    private final ICompensationOrderService service;
    private final IOrderAuthorizationService authorizationService;

    @GetMapping
    @PreAuthorize("hasPermission('/api/returns', 'GET')")
    public ResponseEntity<List<CompensationOrder>> getAll(@RequestParam(defaultValue = "ALL") String status) {
        return ResponseEntity.ok(service.getAll(status));
    }

    @GetMapping("/return-order/{returnOrderId}")
    public ResponseEntity<CompensationOrder> getByReturnOrder(@PathVariable String returnOrderId,
                                                              Authentication authentication) {
        authorizationService.requireReturnAccess(returnOrderId, authentication);
        CompensationOrder result = service.getByReturnOrderId(returnOrderId);
        return result == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(result);
    }

    @PutMapping("/admin/{id}/reserve")
    @PreAuthorize("hasPermission('/api/returns/admin/{id}/status', 'PUT')")
    public ResponseEntity<CompensationOrder> reserve(@PathVariable String id) {
        return ResponseEntity.ok(service.reserveInventory(id));
    }

    @PutMapping("/admin/{id}/ship")
    @PreAuthorize("hasPermission('/api/returns/admin/{id}/status', 'PUT')")
    public ResponseEntity<CompensationOrder> ship(@PathVariable String id) {
        return ResponseEntity.ok(service.createShipment(id));
    }

    @PutMapping("/admin/{id}/complete")
    @PreAuthorize("hasPermission('/api/returns/admin/{id}/status', 'PUT')")
    public ResponseEntity<CompensationOrder> complete(@PathVariable String id) {
        return ResponseEntity.ok(service.complete(id));
    }

    @PutMapping("/admin/{id}/cancel")
    @PreAuthorize("hasPermission('/api/returns/admin/{id}/status', 'PUT')")
    public ResponseEntity<CompensationOrder> cancel(@PathVariable String id) {
        return ResponseEntity.ok(service.cancel(id));
    }
}
