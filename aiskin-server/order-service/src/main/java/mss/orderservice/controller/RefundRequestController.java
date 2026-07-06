package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.RefundRequestDto;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.service.RefundRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
@Tag(name = "Refund Requests", description = "Quản lý đơn yêu cầu hoàn tiền")
public class RefundRequestController {

    private final RefundRequestService refundRequestService;

    @PostMapping
    @Operation(summary = "Tạo yêu cầu hoàn tiền", description = "Khách hàng gửi thông tin tài khoản ngân hàng để hoàn tiền")
    public ResponseEntity<RefundRequest> createRefundRequest(
            @RequestBody RefundRequestDto dto) {
        // Fallback or ignore customerId if not provided, rely on service checks
        return ResponseEntity.ok(refundRequestService.createRefundRequest(dto.getCustomerId(), dto));
    }

    @GetMapping("/me/{customerId}")
    @Operation(summary = "Lấy yêu cầu hoàn tiền của khách hàng")
    public ResponseEntity<List<RefundRequest>> getMyRefundRequests(@PathVariable String customerId) {
        return ResponseEntity.ok(refundRequestService.getCustomerRefundRequests(customerId));
    }

    @GetMapping("/return-order/{returnOrderId}")
    @Operation(summary = "Lấy yêu cầu hoàn tiền theo mã khiếu nại")
    public ResponseEntity<RefundRequest> getRefundByReturnOrderId(@PathVariable String returnOrderId) {
        return refundRequestService.getByReturnOrderId(returnOrderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @Operation(summary = "Lấy tất cả yêu cầu hoàn tiền (Admin)")
    public ResponseEntity<List<RefundRequest>> getAllRefundRequests() {
        return ResponseEntity.ok(refundRequestService.getAllRefundRequests());
    }

    @PutMapping("/admin/{id}/complete")
    @Operation(summary = "Admin xác nhận đã chuyển khoản")
    public ResponseEntity<RefundRequest> completeRefund(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String receiptUrl = body != null ? body.get("receiptUrl") : null;
        return ResponseEntity.ok(refundRequestService.completeRefund(id, receiptUrl));
    }

    @PutMapping("/admin/{id}/reject")
    @Operation(summary = "Admin đánh dấu thông tin sai")
    public ResponseEntity<RefundRequest> rejectRefund(@PathVariable String id) {
        return ResponseEntity.ok(refundRequestService.rejectRefund(id));
    }

    @PutMapping("/{id}/resubmit")
    @Operation(summary = "Khách hàng cập nhật lại thông tin ngân hàng")
    public ResponseEntity<RefundRequest> resubmitRefund(
            @PathVariable String id,
            @RequestBody RefundRequestDto dto) {
        return ResponseEntity.ok(refundRequestService.resubmitRefund(id, dto));
    }
}
