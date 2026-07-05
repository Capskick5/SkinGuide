package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.model.Order;
import mss.orderservice.repository.OrderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/orders/ghn-webhook")
@Tag(name = "GHN Webhook", description = "Nhận cập nhật trạng thái đơn hàng từ GHN")
@RequiredArgsConstructor
public class GhnWebhookController {

    private final OrderRepository orderRepository;

    @PostMapping
    @Operation(summary = "GHN Webhook Endpoint")
    public ResponseEntity<String> handleGhnWebhook(@RequestBody Map<String, Object> payload) {
        log.info("Nhận Webhook từ GHN: {}", payload);

        try {
            String orderCode = (String) payload.get("OrderCode");
            String status = (String) payload.get("Status");

            if (orderCode == null || status == null) {
                return ResponseEntity.badRequest().body("Thiếu dữ liệu OrderCode hoặc Status");
            }

            Order order = orderRepository.findByOrderCode(orderCode).orElse(null);
            if (order == null) {
                log.warn("Không tìm thấy Order trong hệ thống với GHN code: {}", orderCode);
                return ResponseEntity.ok("OK"); // Vẫn trả về OK để GHN không spam lại
            }

            // Ánh xạ trạng thái GHN sang trạng thái Hệ thống
            switch (status) {
                case "ready_to_pick":
                case "picking":
                case "storing":
                case "transporting":
                case "delivering":
                    order.setStatus(Order.OrderStatus.DELIVERING);
                    break;
                case "delivered":
                    order.setStatus(Order.OrderStatus.DELIVERED);
                    break;
                case "delivery_fail":
                case "return":
                case "return_fail":
                case "returned":
                    order.setStatus(Order.OrderStatus.DELIVERY_FAILED);
                    break;
                case "cancel":
                    order.setStatus(Order.OrderStatus.CANCELLED);
                    break;
                default:
                    log.info("Trạng thái GHN {} không cần map.", status);
                    break;
            }

            orderRepository.save(order);
            return ResponseEntity.ok("OK");

        } catch (Exception e) {
            log.error("Lỗi xử lý webhook GHN: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Error");
        }
    }
}
