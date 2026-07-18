package mss.productservice.controller;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.InventoryAdjustmentRequest;
import mss.productservice.dto.request.InventoryReservationRequest;
import mss.productservice.dto.request.InventoryReturnRequest;
import mss.productservice.dto.response.ApiResponse;
import mss.productservice.dto.response.InventoryMovementResponse;
import mss.productservice.dto.response.InventoryReservationResponse;
import mss.productservice.service.impl.InventoryService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import mss.productservice.service.IInventoryService;

@RestController
@RequestMapping("/api/products/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final IInventoryService inventoryService;

    @GetMapping("/movements")
    @PreAuthorize("hasPermission('/api/products/inventory/movements', 'GET')")
    public ResponseEntity<ApiResponse<Page<InventoryMovementResponse>>> getMovements(@RequestParam(required = false) String productId, @RequestParam(required = false) String variantId, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getMovements(productId, variantId, page, size)));
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasPermission('/api/products/inventory/adjust', 'POST')")
    public ResponseEntity<ApiResponse<InventoryMovementResponse>> adjust(@Valid @RequestBody InventoryAdjustmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Inventory adjusted", inventoryService.adjust(request)));
    }

    @PostMapping("/internal/reserve")
    public ResponseEntity<ApiResponse<InventoryReservationResponse>> reserve(@Valid @RequestBody InventoryReservationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.reserve(request)));
    }

    @PostMapping("/internal/release")
    public ResponseEntity<ApiResponse<InventoryReservationResponse>> release(@Valid @RequestBody InventoryReservationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.release(request)));
    }

    @PostMapping("/internal/commit")
    public ResponseEntity<ApiResponse<InventoryReservationResponse>> commit(@Valid @RequestBody InventoryReservationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.commit(request)));
    }

    @PostMapping("/internal/process-return")
    public ResponseEntity<ApiResponse<InventoryReservationResponse>> processReturn(@Valid @RequestBody InventoryReturnRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.processReturn(request)));
    }
}
