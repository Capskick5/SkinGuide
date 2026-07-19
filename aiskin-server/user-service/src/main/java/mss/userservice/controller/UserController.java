// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import mss.userservice.dto.ChangePasswordRequest;
import mss.userservice.dto.UpdateProfileRequest;
import mss.userservice.dto.UserResponse;
import mss.userservice.model.DeliveryAddress;
import mss.userservice.service.impl.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import mss.userservice.service.IUserService;

/**
 * Authenticated user endpoints. Requires a valid Bearer access token.
 */
@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Thông tin & quản lý tài khoản người dùng")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final IUserService userService;

    public UserController(IUserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin người dùng hiện tại")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(userService.getById(userId));
    }

    @PutMapping("/me")
    @Operation(summary = "Cập nhật hồ sơ (tên, hồ sơ da)")
    public ResponseEntity<UserResponse> updateProfile(@AuthenticationPrincipal String userId, @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PutMapping("/me/delivery-address")
    @Operation(summary = "Lưu địa chỉ giao hàng mặc định")
    public ResponseEntity<DeliveryAddress> updateDeliveryAddress(@AuthenticationPrincipal String userId, @Valid @RequestBody DeliveryAddress address) {
        return ResponseEntity.ok(userService.updateDeliveryAddress(userId, address));
    }

    @PostMapping("/me/change-password")
    @Operation(summary = "Đổi mật khẩu")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal String userId, @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(userId, request);
        return ResponseEntity.noContent().build();
    }
}
