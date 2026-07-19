// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service;

import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.RefundBankDetailsRequest;
import mss.orderservice.dto.RefundCreateRequest;
import mss.orderservice.model.Order;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public interface IRefundRequestService {

    RefundRequest createRefundRequest(String customerId, RefundCreateRequest request);

    RefundRequest completeRefund(String id, String receiptUrl);

    List<RefundRequest> getAllRefundRequests();

    List<RefundRequest> getCustomerRefundRequests(String customerId);

    Optional<RefundRequest> getByReturnOrderId(String returnOrderId);

    RefundRequest rejectRefund(String id);

    RefundRequest resubmitRefund(String id, RefundBankDetailsRequest requestDetails);
}
