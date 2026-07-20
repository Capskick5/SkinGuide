// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import mss.userservice.service.IFavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Danh sách sản phẩm yêu thích của người dùng đã đăng nhập.
 * Nằm dưới /api/users nên được gateway route sẵn về user-service (yêu cầu Bearer token).
 */
@RestController
@RequestMapping("/api/users/me/favorites")
@Tag(name = "Favorites", description = "Sản phẩm yêu thích của người dùng")
@SecurityRequirement(name = "bearerAuth")
public class FavoriteController {

    private final IFavoriteService favoriteService;

    public FavoriteController(IFavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách productId yêu thích")
    public ResponseEntity<List<String>> list(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(favoriteService.list(userId));
    }

    @PutMapping("/{productId}")
    @Operation(summary = "Thêm một sản phẩm vào yêu thích (idempotent)")
    public ResponseEntity<List<String>> add(@AuthenticationPrincipal String userId, @PathVariable String productId) {
        return ResponseEntity.ok(favoriteService.add(userId, productId));
    }

    @DeleteMapping("/{productId}")
    @Operation(summary = "Bỏ một sản phẩm khỏi yêu thích")
    public ResponseEntity<List<String>> remove(@AuthenticationPrincipal String userId, @PathVariable String productId) {
        return ResponseEntity.ok(favoriteService.remove(userId, productId));
    }

    @PostMapping("/merge")
    @Operation(summary = "Gộp yêu thích từ localStorage của khách vào server khi đăng nhập")
    public ResponseEntity<List<String>> merge(@AuthenticationPrincipal String userId, @RequestBody(required = false) List<String> productIds) {
        return ResponseEntity.ok(favoriteService.merge(userId, productIds));
    }

    @DeleteMapping
    @Operation(summary = "Xóa toàn bộ yêu thích")
    public ResponseEntity<List<String>> clear(@AuthenticationPrincipal String userId) {
        favoriteService.clear(userId);
        return ResponseEntity.ok(List.of());
    }
}
