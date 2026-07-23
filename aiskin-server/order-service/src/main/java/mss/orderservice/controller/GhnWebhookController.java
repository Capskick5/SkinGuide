// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.model.Order;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.model.CompensationOrder;
import mss.orderservice.config.GhnConfig;
import mss.orderservice.service.impl.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import mss.orderservice.service.IOrderService;
import mss.orderservice.service.ICompensationOrderService;

@Slf4j
@RestController
@RequestMapping("/api/orders/ghn-webhook")
@Tag(name = "GHN Webhook", description = "Nhận cập nhật trạng thái đơn hàng từ GHN")
public class GhnWebhookController {

    private final OrderRepository orderRepository;

    private final ReturnOrderRepository returnOrderRepository;

    private final IOrderService orderService;

    private final GhnConfig ghnConfig;
    private final CompensationOrderRepository compensationOrderRepository;
    private final ICompensationOrderService compensationOrderService;

    public GhnWebhookController(OrderRepository orderRepository,
                                ReturnOrderRepository returnOrderRepository,
                                IOrderService orderService,
                                GhnConfig ghnConfig,
                                CompensationOrderRepository compensationOrderRepository,
                                ICompensationOrderService compensationOrderService) {
        this.orderRepository = orderRepository;
        this.returnOrderRepository = returnOrderRepository;
        this.orderService = orderService;
        this.ghnConfig = ghnConfig;
        this.compensationOrderRepository = compensationOrderRepository;
        this.compensationOrderService = compensationOrderService;
    }

    @PostMapping
    @Operation(summary = "GHN Webhook Endpoint")
    public ResponseEntity<String> handleGhnWebhook(@RequestBody Map<String, Object> payload, @org.springframework.web.bind.annotation.RequestHeader(value = "X-GHN-Webhook-Secret", required = false) String headerSecret, @org.springframework.web.bind.annotation.RequestParam(value = "token", required = false) String querySecret) {
        String suppliedSecret = headerSecret != null ? headerSecret : querySecret;
        if (!validWebhookSecret(suppliedSecret)) {
            return ResponseEntity.status(401).body("Invalid webhook secret");
        }
        log.info("Nhận Webhook từ GHN: {}", payload);
        try {
            String ghnOrderCode = stringValue(payload.get("OrderCode"));
            String clientOrderCode = stringValue(payload.get("ClientOrderCode"));
            String status = stringValue(payload.get("Status"));
            if (isBlank(ghnOrderCode) || isBlank(status)) {
                return ResponseEntity.badRequest().body("Thiếu dữ liệu OrderCode hoặc Status");
            }
            log.info("Processing GHN webhook for order {} with status {}", ghnOrderCode, status);
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
                CompensationOrder compensation = compensationOrderRepository.findByTrackingCode(ghnOrderCode).orElse(null);
                if (compensation != null) {
                    if ("delivered".equals(status) || "deliveried".equals(status)) {
                        compensationOrderService.complete(compensation.getId());
                    }
                    return ResponseEntity.ok("OK");
                }
                log.warn("Không tìm thấy Order hay ReturnOrder trong hệ thống với GHN code: {} hoặc Client code: {}", ghnOrderCode, clientOrderCode);
                // Vẫn trả về OK để GHN không spam lại
                return ResponseEntity.ok("OK");
            }
            // Ánh xạ trạng thái GHN sang trạng thái Hệ thống
            Order.OrderStatus newStatus = orderService.mapGhnStatusToSystemStatus(status);
            if (newStatus != null) {
                String note = "Webhook cập nhật từ GHN";
                if (newStatus == Order.OrderStatus.REFUSED) {
                    note = "Khách hàng từ chối nhận hàng";
                } else if (newStatus == Order.OrderStatus.RETURNED) {
                    note = "Đã hoàn hàng về kho";
                } else if (newStatus == Order.OrderStatus.DELIVERED) {
                    note = "Khách hàng đã thanh toán và giao hàng thành công";
                } else {
                    String description = stringValue(payload.get("Description"));
                    if (description != null && !description.trim().isEmpty()) {
                        note = "GHN: " + description;
                    }
                }
                orderService.applyShippingStatus(order, newStatus, note);
            }
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Lỗi xử lý webhook GHN: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Error");
        }
    }

    private boolean validWebhookSecret(String suppliedSecret) {
        String expected = ghnConfig.getWebhookSecret();
        return expected != null && !expected.isBlank() && suppliedSecret != null && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), suppliedSecret.getBytes(StandardCharsets.UTF_8));
    }

    private String stringValue(Object value) {
        return value instanceof String string ? string.trim() : null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void handleReturnOrderWebhook(ReturnOrder returnOrder, String status) {
        // Webhook cũ/đến trễ không được kéo lùi đơn đã sang hoàn tiền/giao lại.
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.DELIVERING) {
            return;
        }
        ReturnOrder.ReturnStatus newStatus = null;
        switch(status) {
            case "picking":
            case "picked":
            case "storing":
            case "sorting":
            case "transporting":
            case "delivering":
                newStatus = ReturnOrder.ReturnStatus.DELIVERING;
                break;
            case "delivered":
            case "deliveried":
                newStatus = ReturnOrder.ReturnStatus.DELIVERED;
                break;
        }
        // Chỉ GHN được phép xác nhận kiện hoàn đã đến kho. Webhook vận chuyển
        // đến trễ hoặc trùng lặp không được kéo lùi trạng thái.
        if (newStatus == ReturnOrder.ReturnStatus.DELIVERED) {
            returnOrder.setStatus(newStatus);
            returnOrderRepository.save(returnOrder);
            log.info("Đã cập nhật trạng thái ReturnOrder {} thành {}", returnOrder.getId(), newStatus);
        }
    }
}
