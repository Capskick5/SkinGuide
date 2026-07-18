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

public interface IOrderAuthorizationService {

    void requireSameCustomerOrAdmin(String customerId, Authentication authentication);

    void requireOrderAccess(String orderId, Authentication authentication);

    void requireReturnAccess(String returnId, Authentication authentication);

    void requireReturnByOrderAccess(String orderId, Authentication authentication);

    void requireRefundAccess(String refundId, Authentication authentication);

    void requireRefundByReturnAccess(String returnOrderId, Authentication authentication);
}
