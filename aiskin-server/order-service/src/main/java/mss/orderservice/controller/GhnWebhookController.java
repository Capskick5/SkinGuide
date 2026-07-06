package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.model.Order;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
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
    private final ReturnOrderRepository returnOrderRepository;

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
                // Thử tìm trong ReturnOrder
                ReturnOrder returnOrder = returnOrderRepository.findByReturnTrackingCode(ghnOrderCode).orElse(null);
                if (returnOrder != null) {
                    handleReturnOrderWebhook(returnOrder, status);
                    return ResponseEntity.ok("OK");
                }
                
                log.warn("Không tìm thấy Order hay ReturnOrder trong hệ thống với GHN code: {} hoặc Client code: {}", ghnOrderCode, clientOrderCode);
                return ResponseEntity.ok("OK"); // Vẫn trả về OK để GHN không spam lại
            }

            // Ánh xạ trạng thái GHN sang trạng thái Hệ thống
            Order.OrderStatus newStatus = null;
            switch (status) {
                case "ready_to_pick":
                    newStatus = Order.OrderStatus.READY_TO_PICK;
                    break;
                case "picking":
                    newStatus = Order.OrderStatus.PICKING;
                    break;
                case "picked":
                    newStatus = Order.OrderStatus.PICKED;
                    break;
                case "storing":
                    newStatus = Order.OrderStatus.STORING;
                    break;
                case "sorting":
                    newStatus = Order.OrderStatus.SORTING;
                    break;
                case "transporting":
                    newStatus = Order.OrderStatus.TRANSPORTING;
                    break;
                case "delivering":
                    newStatus = Order.OrderStatus.DELIVERING;
                    break;
                case "delivered":
                case "deliveried":
                    newStatus = Order.OrderStatus.DELIVERED;
                    break;
                case "delivery_fail":
                    newStatus = Order.OrderStatus.DELIVERY_FAIL;
                    break;
                case "waiting_to_return":
                    newStatus = Order.OrderStatus.WAITING_TO_RETURN;
                    break;
                case "return":
                    newStatus = Order.OrderStatus.RETURN;
                    break;
                case "return_transporting":
                    newStatus = Order.OrderStatus.RETURN_TRANSPORTING;
                    break;
                case "returning":
                    newStatus = Order.OrderStatus.RETURNING;
                    break;
                case "return_fail":
                    newStatus = Order.OrderStatus.RETURN_FAIL;
                    break;
                case "returned":
                    newStatus = Order.OrderStatus.RETURNED;
                    break;
                case "cancel":
                    newStatus = Order.OrderStatus.CANCELLED;
                    break;
                default:
                    log.info("Trạng thái GHN {} không cần map.", status);
                    break;
            }

            if (newStatus != null) {
                String description = (String) payload.get("Description");
                String note = "Webhook cập nhật từ GHN";
                if (description != null && !description.trim().isEmpty()) {
                    note = "GHN: " + description;
                }
                order.addStatusHistory(newStatus, note);
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

    private void handleReturnOrderWebhook(ReturnOrder returnOrder, String status) {
        // Nếu đã hoàn thành quy trình rồi thì bỏ qua
        if (returnOrder.getStatus() == ReturnOrder.ReturnStatus.RECEIVED || 
            returnOrder.getStatus() == ReturnOrder.ReturnStatus.REFUNDED ||
            returnOrder.getStatus() == ReturnOrder.ReturnStatus.REJECTED) {
            return;
        }

        ReturnOrder.ReturnStatus newStatus = null;
        switch (status) {
            case "picking":
            case "picked":
            case "storing":
            case "sorting":
            case "transporting":
                newStatus = ReturnOrder.ReturnStatus.TRANSPORTING;
                break;
            case "delivering":
                newStatus = ReturnOrder.ReturnStatus.DELIVERING;
                break;
            case "delivered":
            case "deliveried":
                newStatus = ReturnOrder.ReturnStatus.DELIVERED;
                break;
        }

        if (newStatus != null && returnOrder.getStatus() != newStatus) {
            returnOrder.setStatus(newStatus);
            returnOrderRepository.save(returnOrder);
            log.info("Đã cập nhật trạng thái ReturnOrder {} thành {}", returnOrder.getId(), newStatus);
        }
    }
}
