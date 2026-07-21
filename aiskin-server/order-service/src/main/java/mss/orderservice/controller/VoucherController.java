// Project: SkinGuide - MSS301
// Service Component

package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.VoucherRequest;
import mss.orderservice.dto.VoucherValidationResponse;
import mss.orderservice.model.Voucher;
import mss.orderservice.service.IVoucherService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/vouchers")
@Tag(name = "Voucher Controller", description = "Endpoints for validating and managing discount vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final IVoucherService voucherService;

    @GetMapping("/validate")
    @Operation(summary = "Xem trước mã giảm giá", description = "Kiểm tra mã và tính số tiền được giảm dựa trên subtotal, không ghi vào DB")
    public ResponseEntity<VoucherValidationResponse> validate(@RequestParam String code, @RequestParam BigDecimal subtotal) {
        BigDecimal discount = voucherService.validateAndCalculateDiscount(code, subtotal);
        return ResponseEntity.ok(VoucherValidationResponse.builder().code(code == null ? null : code.trim().toUpperCase()).discountAmount(discount).build());
    }

    @PostMapping
    @PreAuthorize("hasPermission('/api/vouchers', 'POST')")
    @Operation(summary = "Tạo voucher", description = "Admin endpoint tạo mã giảm giá mới")
    public ResponseEntity<Voucher> create(@Valid @RequestBody VoucherRequest request) {
        return ResponseEntity.ok(voucherService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasPermission('/api/vouchers/{id}', 'PUT')")
    @Operation(summary = "Sửa voucher", description = "Admin endpoint cập nhật mã giảm giá")
    public ResponseEntity<Voucher> update(@PathVariable String id, @Valid @RequestBody VoucherRequest request) {
        return ResponseEntity.ok(voucherService.update(id, request));
    }

    @GetMapping
    @PreAuthorize("hasPermission('/api/vouchers', 'GET')")
    @Operation(summary = "Danh sách voucher", description = "Admin endpoint liệt kê voucher có phân trang")
    public ResponseEntity<Page<Voucher>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(voucherService.list(page, size));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasPermission('/api/vouchers/{id}', 'DELETE')")
    @Operation(summary = "Xóa/deactivate voucher", description = "Admin endpoint ngưng hoạt động một mã giảm giá")
    public ResponseEntity<?> delete(@PathVariable String id) {
        voucherService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
