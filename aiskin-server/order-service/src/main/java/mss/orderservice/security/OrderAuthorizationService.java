package mss.orderservice.security;

import lombok.RequiredArgsConstructor;
import mss.orderservice.model.Order;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrderAuthorizationService {

    private final OrderRepository orderRepository;
    private final ReturnOrderRepository returnOrderRepository;
    private final RefundRequestRepository refundRequestRepository;

    public void requireSameCustomerOrAdmin(String customerId, Authentication authentication) {
        if (!isAdmin(authentication) && !authentication.getName().equals(customerId)) {
            throw forbidden();
        }
    }

    public void requireOrderAccess(String orderId, Authentication authentication) {
        Order order;
        if (orderId != null && orderId.startsWith("ORD-")) {
            order = orderRepository.findByOrderCode(orderId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        } else {
            order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        }
        requireSameCustomerOrAdmin(order.getCustomerId(), authentication);
    }

    public void requireReturnAccess(String returnId, Authentication authentication) {
        ReturnOrder returnOrder = returnOrderRepository.findById(returnId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Return order not found"));
        requireSameCustomerOrAdmin(returnOrder.getCustomerId(), authentication);
    }

    public void requireReturnByOrderAccess(String orderId, Authentication authentication) {
        requireOrderAccess(orderId, authentication);
    }

    public void requireRefundAccess(String refundId, Authentication authentication) {
        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Refund request not found"));
        requireSameCustomerOrAdmin(refund.getCustomerId(), authentication);
    }

    public void requireRefundByReturnAccess(String returnOrderId, Authentication authentication) {
        ReturnOrder returnOrder = returnOrderRepository.findById(returnOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Return order not found"));
        requireSameCustomerOrAdmin(returnOrder.getCustomerId(), authentication);
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập dữ liệu của khách hàng khác");
    }
}
