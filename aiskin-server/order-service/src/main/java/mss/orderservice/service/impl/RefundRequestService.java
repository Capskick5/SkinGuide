// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service.impl;

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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import mss.orderservice.service.*;

@Service
@RequiredArgsConstructor
public class RefundRequestService implements IRefundRequestService {

    private final RefundRequestRepository refundRequestRepository;

    private final ReturnOrderRepository returnOrderRepository;

    private final OrderRepository orderRepository;

    public RefundRequest createRefundRequest(String customerId, RefundCreateRequest request) {
        ReturnOrder returnOrder = returnOrderRepository.findById(request.returnOrderId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn khiếu nại"));
        if (!returnOrder.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền tạo yêu cầu hoàn tiền cho đơn này");
        }
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.RECEIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn khiếu nại chưa hoàn tất trả hàng, không thể tạo yêu cầu hoàn tiền");
        }
        if (refundRequestRepository.findByReturnOrderId(returnOrder.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn này đã có yêu cầu hoàn tiền");
        }
        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setReturnOrderId(returnOrder.getId());
        refundRequest.setOrderId(returnOrder.getOrderId());
        refundRequest.setOrderCode(returnOrder.getOrderCode());
        refundRequest.setCustomerId(returnOrder.getCustomerId());
        refundRequest.setCustomerName(returnOrder.getCustomerName());
        java.math.BigDecimal amount = returnOrder.getRefundAmount();
        if (amount == null && returnOrder.getItems() != null) {
            amount = returnOrder.getItems().stream().map(item -> item.getSubTotal() != null ? item.getSubTotal() : java.math.BigDecimal.ZERO).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        }
        if (amount == null || amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số tiền hoàn trả không hợp lệ");
        }
        refundRequest.setAmount(amount);
        applyBankDetails(refundRequest, request.bankName(), request.accountNumber(), request.accountName());
        refundRequest.setStatus(RefundRequest.RefundStatus.PENDING);
        return refundRequestRepository.save(refundRequest);
    }

    @Transactional
    public RefundRequest completeRefund(String id, String receiptUrl) {
        RefundRequest request = refundRequestRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));
        if (request.getStatus() == RefundRequest.RefundStatus.COMPLETED) {
            return request;
        }
        if (request.getStatus() != RefundRequest.RefundStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể hoàn tất yêu cầu đang chờ xử lý");
        }
        ReturnOrder returnOrder = returnOrderRepository.findById(request.getReturnOrderId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Không tìm thấy yêu cầu trả hàng tương ứng"));
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.RECEIVED && returnOrder.getStatus() != ReturnOrder.ReturnStatus.REFUNDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Kho chưa xác nhận nhận hàng trả nên chưa thể hoàn tiền");
        }
        if (!Boolean.TRUE.equals(returnOrder.getInventoryProcessed())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Hàng trả chưa được kho phân loại nên chưa thể hoàn tiền");
        }
        Order order = orderRepository.findById(request.getOrderId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Không tìm thấy đơn hàng gốc"));
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID && order.getPaymentStatus() != Order.PaymentStatus.REFUNDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trạng thái thanh toán của đơn hàng không cho phép hoàn tiền");
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.REFUNDED) {
            order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
            orderRepository.save(order);
        }
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.REFUNDED) {
            returnOrder.setStatus(ReturnOrder.ReturnStatus.REFUNDED);
            returnOrderRepository.save(returnOrder);
        }
        request.setStatus(RefundRequest.RefundStatus.COMPLETED);
        request.setReceiptUrl(receiptUrl == null || receiptUrl.isBlank() ? null : receiptUrl.trim());
        return refundRequestRepository.save(request);
    }

    public List<RefundRequest> getAllRefundRequests() {
        return refundRequestRepository.findAll();
    }

    public List<RefundRequest> getCustomerRefundRequests(String customerId) {
        return refundRequestRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public Optional<RefundRequest> getByReturnOrderId(String returnOrderId) {
        return refundRequestRepository.findByReturnOrderId(returnOrderId);
    }

    public RefundRequest rejectRefund(String id) {
        RefundRequest request = refundRequestRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));
        if (request.getStatus() == RefundRequest.RefundStatus.REJECTED) {
            return request;
        }
        if (request.getStatus() != RefundRequest.RefundStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể từ chối yêu cầu hoàn tiền đã hoàn tất");
        }
        request.setStatus(RefundRequest.RefundStatus.REJECTED);
        return refundRequestRepository.save(request);
    }

    public RefundRequest resubmitRefund(String id, RefundBankDetailsRequest requestDetails) {
        RefundRequest request = refundRequestRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));
        if (request.getStatus() != RefundRequest.RefundStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể cập nhật lại khi thông tin bị đánh dấu sai");
        }
        applyBankDetails(request, requestDetails.bankName(), requestDetails.accountNumber(), requestDetails.accountName());
        request.setStatus(RefundRequest.RefundStatus.PENDING);
        return refundRequestRepository.save(request);
    }

    private void applyBankDetails(RefundRequest request, String bankName, String accountNumber, String accountName) {
        request.setBankName(bankName.trim());
        request.setAccountNumber(accountNumber.trim());
        request.setAccountName(accountName.trim().toUpperCase(Locale.ROOT));
    }
}
