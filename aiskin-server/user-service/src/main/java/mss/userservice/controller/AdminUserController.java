package mss.userservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import mss.userservice.dto.UserResponse;
import mss.userservice.model.Role;
import mss.userservice.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Admin-only user management. Requires ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin/users")
@Tag(name = "Admin - Users", description = "Quản trị người dùng (chỉ ADMIN)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @Operation(summary = "Danh sách người dùng (phân trang)")
    public ResponseEntity<Page<UserResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(userService.listUsers(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết người dùng")
    public ResponseEntity<UserResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @PostMapping("/{id}/activate")
    @Operation(summary = "Kích hoạt tài khoản")
    public ResponseEntity<UserResponse> activate(@PathVariable String id) {
        return ResponseEntity.ok(userService.setActive(id, true));
    }

    @PostMapping("/{id}/deactivate")
    @Operation(summary = "Vô hiệu hóa tài khoản")
    public ResponseEntity<UserResponse> deactivate(@PathVariable String id) {
        return ResponseEntity.ok(userService.setActive(id, false));
    }

    @PutMapping("/{id}/role")
    @Operation(summary = "Gán role cho người dùng (USER hoặc ADMIN)")
    public ResponseEntity<UserResponse> setRole(@PathVariable String id, @RequestParam Role role) {
        return ResponseEntity.ok(userService.setRole(id, role));
    }
}
