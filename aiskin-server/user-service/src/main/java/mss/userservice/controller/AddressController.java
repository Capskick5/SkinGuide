// Project: SkinGuide - MSS301
// Service Component

package mss.userservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import mss.userservice.dto.AddressRequest;
import mss.userservice.model.Address;
import mss.userservice.service.IAddressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Sổ địa chỉ giao hàng (nhiều địa chỉ) của người dùng đã đăng nhập.
 * Nằm dưới /api/users nên được gateway route sẵn về user-service (yêu cầu Bearer token).
 */
@RestController
@RequestMapping("/api/users/me/addresses")
@Tag(name = "Addresses", description = "Sổ địa chỉ giao hàng của người dùng")
@SecurityRequirement(name = "bearerAuth")
public class AddressController {

    private final IAddressService addressService;

    public AddressController(IAddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách địa chỉ giao hàng")
    public ResponseEntity<List<Address>> list(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(addressService.list(userId));
    }

    @PostMapping
    @Operation(summary = "Thêm địa chỉ giao hàng mới (tự đặt mặc định nếu là địa chỉ đầu tiên)")
    public ResponseEntity<List<Address>> add(@AuthenticationPrincipal String userId, @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.add(userId, request));
    }

    @PutMapping("/{addressId}")
    @Operation(summary = "Cập nhật một địa chỉ giao hàng")
    public ResponseEntity<List<Address>> update(@AuthenticationPrincipal String userId, @PathVariable String addressId, @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.update(userId, addressId, request));
    }

    @DeleteMapping("/{addressId}")
    @Operation(summary = "Xóa một địa chỉ giao hàng (tự chuyển mặc định nếu cần)")
    public ResponseEntity<List<Address>> remove(@AuthenticationPrincipal String userId, @PathVariable String addressId) {
        return ResponseEntity.ok(addressService.remove(userId, addressId));
    }

    @PutMapping("/{addressId}/default")
    @Operation(summary = "Đặt một địa chỉ làm mặc định")
    public ResponseEntity<List<Address>> setDefault(@AuthenticationPrincipal String userId, @PathVariable String addressId) {
        return ResponseEntity.ok(addressService.setDefault(userId, addressId));
    }
}
