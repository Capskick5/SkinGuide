// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import mss.orderservice.service.ICartService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Giỏ hàng của người dùng đã đăng nhập (đồng bộ đa thiết bị).
 * Yêu cầu Bearer token; userId lấy từ authentication.getName().
 */
@RestController
@RequestMapping("/api/carts/me")
@Tag(name = "Cart", description = "Giỏ hàng lưu trên server")
@SecurityRequirement(name = "bearerAuth")
public class CartController {

    private final ICartService cartService;

    public CartController(ICartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @Operation(summary = "Lấy giỏ hàng hiện tại")
    public ResponseEntity<List<Map<String, Object>>> get(Authentication authentication) {
        return ResponseEntity.ok(cartService.get(authentication.getName()));
    }

    @PutMapping
    @Operation(summary = "Thay thế toàn bộ giỏ hàng")
    public ResponseEntity<List<Map<String, Object>>> replace(Authentication authentication, @RequestBody(required = false) List<Map<String, Object>> items) {
        return ResponseEntity.ok(cartService.replace(authentication.getName(), items));
    }

    @DeleteMapping
    @Operation(summary = "Xóa toàn bộ giỏ hàng")
    public ResponseEntity<List<Map<String, Object>>> clear(Authentication authentication) {
        cartService.clear(authentication.getName());
        return ResponseEntity.ok(List.of());
    }
}
