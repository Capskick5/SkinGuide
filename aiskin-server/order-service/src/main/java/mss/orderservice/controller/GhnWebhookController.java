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
            String ghnOrderCode = (String) payload.get("OrderCode"); // Mã vận đơn GHN
            String clientOrderCode = (String) payload.get("ClientOrderCode"); // Mã đơn hàng hệ thống (ORD-...)
            String status = (String) payload.get("Status");

            if (ghnOrderCode == null || status == null) {
                return ResponseEntity.badRequest().body("Thiếu dữ liệu OrderCode hoặc Status");
            }

            Order order = null;
            if (clientOrderCode != null && !clientOrderCode.trim().isEmpty()) {
                order = orderRepository.findByOrderCode(clientOrderCode).orElse(null);
            }
            if (order == null) {
                order = orderRepository.findByTrackingCode(ghnOrderCode).orElse(null);
            }

            if (order == null) {
                log.warn("Không tìm thấy Order trong hệ thống với GHN code: {} hoặc Client code: {}", ghnOrderCode, clientOrderCode);
                return ResponseEntity.ok("OK"); // Vẫn trả về OK để GHN không spam lại
            }

            // Ánh xạ trạng thái GHN sang trạng thái Hệ thống
            switch (status) {
                case "ready_to_pick":
                    order.setStatus(Order.OrderStatus.READY_TO_PICK);
                    break;
                case "picking":
                    order.setStatus(Order.OrderStatus.PICKING);
                    break;
                case "picked":
                    order.setStatus(Order.OrderStatus.PICKED);
                    break;
                case "storing":
                    order.setStatus(Order.OrderStatus.STORING);
                    break;
                case "sorting":
                    order.setStatus(Order.OrderStatus.SORTING);
                    break;
                case "transporting":
                    order.setStatus(Order.OrderStatus.TRANSPORTING);
                    break;
                case "delivering":
                    order.setStatus(Order.OrderStatus.DELIVERING);
                    break;
                case "delivered":
                case "deliveried":
                    order.setStatus(Order.OrderStatus.DELIVERED);
                    break;
                case "delivery_fail":
                    order.setStatus(Order.OrderStatus.DELIVERY_FAIL);
                    break;
                case "waiting_to_return":
                    order.setStatus(Order.OrderStatus.WAITING_TO_RETURN);
                    break;
                case "return":
                    order.setStatus(Order.OrderStatus.RETURN);
                    break;
                case "return_transporting":
                    order.setStatus(Order.OrderStatus.RETURN_TRANSPORTING);
                    break;
                case "returning":
                    order.setStatus(Order.OrderStatus.RETURNING);
                    break;
                case "return_fail":
                    order.setStatus(Order.OrderStatus.RETURN_FAIL);
                    break;
                case "returned":
                    order.setStatus(Order.OrderStatus.RETURNED);
                    break;
                case "cancel":
                    order.setStatus(Order.OrderStatus.CANCELLED);
                    break;
                default:
                    log.info("Trạng thái GHN {} không cần map.", status);
                    break;
            }

            // Update payment status based on new order status
            if ((order.getStatus() == Order.OrderStatus.CANCELLED || order.getStatus() == Order.OrderStatus.REFUSED)
                && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
            }
            if (order.getStatus() == Order.OrderStatus.DELIVERED && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                order.setPaymentStatus(Order.PaymentStatus.PAID);
            }

            orderRepository.save(order);
            return ResponseEntity.ok("OK");

        } catch (Exception e) {
            log.error("Lỗi xử lý webhook GHN: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Error");
        }
    }
}
