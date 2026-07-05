package mss.orderservice.service;

import lombok.RequiredArgsConstructor;
import mss.orderservice.model.Order;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReturnOrderService {

    private final ReturnOrderRepository returnOrderRepository;
    private final OrderRepository orderRepository;

    public ReturnOrder createReturnRequest(String orderId, Map<String, Object> request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getStatus() != Order.OrderStatus.DELIVERED) {
            throw new RuntimeException("Chỉ được yêu cầu trả hàng khi đơn đã giao thành công");
        }
        if (order.getPaymentMethod() == Order.PaymentMethod.COD) {
            throw new RuntimeException("Đơn COD không hỗ trợ trả hàng qua hệ thống");
        }

        // Check if already requested
        if (returnOrderRepository.findByOrderId(orderId).isPresent()) {
            throw new RuntimeException("Đơn hàng này đã có yêu cầu trả hàng");
        }

        ReturnOrder returnOrder = ReturnOrder.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .customerId(order.getCustomerId())
                .customerName(order.getCustomerName())
                .reason((String) request.get("reason"))
                .description((String) request.get("description"))
                .imageUrls((List<String>) request.get("imageUrls"))
                .refundAmount(order.getTotalAmount()) // Mặc định hoàn trả toàn bộ
                .status(ReturnOrder.ReturnStatus.PENDING)
                .build();

        return returnOrderRepository.save(returnOrder);
    }

    public List<ReturnOrder> getReturnsByCustomer(String customerId) {
        return returnOrderRepository.findByCustomerId(customerId);
    }

    public List<ReturnOrder> getAllReturns() {
        return returnOrderRepository.findAll();
    }

    public ReturnOrder updateReturnStatus(String id, String newStatusStr) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Return Order not found"));
        
        ReturnOrder.ReturnStatus newStatus = ReturnOrder.ReturnStatus.valueOf(newStatusStr);
        returnOrder.setStatus(newStatus);
        ReturnOrder saved = returnOrderRepository.save(returnOrder);

        // NẾU HOÀN TIỀN THÀNH CÔNG -> Cập nhật Order chính
        if (newStatus == ReturnOrder.ReturnStatus.REFUNDED) {
            Order order = orderRepository.findById(returnOrder.getOrderId()).orElse(null);
            if (order != null) {
                order.setStatus(Order.OrderStatus.RETURNED);
                order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
                orderRepository.save(order);
            }
        }

        return saved;
    }
}
