package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.RefundBankDetailsRequest;
import mss.orderservice.dto.RefundCompletionRequest;
import mss.orderservice.dto.RefundCreateRequest;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.security.OrderAuthorizationService;
import mss.orderservice.service.RefundRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
@Tag(name = "Refund Requests", description = "Quản lý đơn yêu cầu hoàn tiền")
public class RefundRequestController {

    private final RefundRequestService refundRequestService;
    private final OrderAuthorizationService authorizationService;

    @PostMapping
    @Operation(summary = "Tạo yêu cầu hoàn tiền", description = "Khách hàng gửi thông tin tài khoản ngân hàng để hoàn tiền")
    public ResponseEntity<RefundRequest> createRefundRequest(
            @Valid @RequestBody RefundCreateRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(refundRequestService.createRefundRequest(
                authentication.getName(), request));
    }

    @GetMapping("/me/{customerId}")
    @Operation(summary = "Lấy yêu cầu hoàn tiền của khách hàng")
    public ResponseEntity<List<RefundRequest>> getMyRefundRequests(
            @PathVariable String customerId,
            Authentication authentication) {
        authorizationService.requireSameCustomerOrAdmin(customerId, authentication);
        return ResponseEntity.ok(refundRequestService.getCustomerRefundRequests(customerId));
    }

    @GetMapping("/return-order/{returnOrderId}")
    @Operation(summary = "Lấy yêu cầu hoàn tiền theo mã khiếu nại")
    public ResponseEntity<RefundRequest> getRefundByReturnOrderId(
            @PathVariable String returnOrderId,
            Authentication authentication) {
        authorizationService.requireRefundByReturnAccess(returnOrderId, authentication);
        return refundRequestService.getByReturnOrderId(returnOrderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy tất cả yêu cầu hoàn tiền (Admin)")
    public ResponseEntity<List<RefundRequest>> getAllRefundRequests() {
        return ResponseEntity.ok(refundRequestService.getAllRefundRequests());
    }

    @PutMapping("/admin/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin xác nhận đã chuyển khoản")
    public ResponseEntity<RefundRequest> completeRefund(
            @PathVariable String id,
            @Valid @RequestBody(required = false) RefundCompletionRequest body) {
        String receiptUrl = body != null ? body.receiptUrl() : null;
        return ResponseEntity.ok(refundRequestService.completeRefund(id, receiptUrl));
    }

    @PutMapping("/admin/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin đánh dấu thông tin sai")
    public ResponseEntity<RefundRequest> rejectRefund(@PathVariable String id) {
        return ResponseEntity.ok(refundRequestService.rejectRefund(id));
    }

    @PutMapping("/{id}/resubmit")
    @Operation(summary = "Khách hàng cập nhật lại thông tin ngân hàng")
    public ResponseEntity<RefundRequest> resubmitRefund(
            @PathVariable String id,
            @Valid @RequestBody RefundBankDetailsRequest request,
            Authentication authentication) {
        authorizationService.requireRefundAccess(id, authentication);
        return ResponseEntity.ok(refundRequestService.resubmitRefund(id, request));
    }
}
