package mss.orderservice.service;

import lombok.RequiredArgsConstructor;
import mss.orderservice.dto.RefundRequestDto;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RefundRequestService {
    private final RefundRequestRepository refundRequestRepository;
    private final ReturnOrderRepository returnOrderRepository;

    public RefundRequest createRefundRequest(String customerId, RefundRequestDto dto) {
        ReturnOrder returnOrder = returnOrderRepository.findById(dto.getReturnOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn khiếu nại"));

        if (!returnOrder.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền tạo yêu cầu hoàn tiền cho đơn này");
        }

        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.RECEIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn khiếu nại chưa hoàn tất trả hàng, không thể tạo yêu cầu hoàn tiền");
        }

        Optional<RefundRequest> existing = refundRequestRepository.findByReturnOrderId(returnOrder.getId());
        if (existing.isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn này đã có yêu cầu hoàn tiền");
        }

        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setReturnOrderId(returnOrder.getId());
        refundRequest.setOrderId(returnOrder.getOrderId());
        refundRequest.setOrderCode(returnOrder.getOrderCode());
        refundRequest.setCustomerId(returnOrder.getCustomerId());
        refundRequest.setCustomerName(returnOrder.getCustomerName());

        // Ưu tiên refundAmount, fallback sang tổng items nếu null
        java.math.BigDecimal amount = returnOrder.getRefundAmount();
        if (amount == null && returnOrder.getItems() != null) {
            amount = returnOrder.getItems().stream()
                    .map(item -> item.getSubTotal() != null ? item.getSubTotal() : java.math.BigDecimal.ZERO)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        }
        refundRequest.setAmount(amount);

        refundRequest.setBankName(dto.getBankName());
        refundRequest.setAccountNumber(dto.getAccountNumber());
        refundRequest.setAccountName(dto.getAccountName());
        refundRequest.setStatus(RefundRequest.RefundStatus.PENDING);

        return refundRequestRepository.save(refundRequest);
    }

    public RefundRequest completeRefund(String id, String receiptUrl) {
        RefundRequest request = refundRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));

        request.setStatus(RefundRequest.RefundStatus.COMPLETED);
        if (receiptUrl != null && !receiptUrl.trim().isEmpty()) {
            request.setReceiptUrl(receiptUrl);
        }
        refundRequestRepository.save(request);

        // Update ReturnOrder status
        returnOrderRepository.findById(request.getReturnOrderId()).ifPresent(returnOrder -> {
            returnOrder.setStatus(ReturnOrder.ReturnStatus.REFUNDED);
            returnOrderRepository.save(returnOrder);
        });

        return request;
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
        RefundRequest request = refundRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));
        request.setStatus(RefundRequest.RefundStatus.REJECTED);
        return refundRequestRepository.save(request);
    }

    public RefundRequest resubmitRefund(String id, RefundRequestDto dto) {
        RefundRequest request = refundRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));

        if (request.getStatus() != RefundRequest.RefundStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể cập nhật lại khi thông tin bị đánh dấu sai");
        }

        request.setBankName(dto.getBankName());
        request.setAccountNumber(dto.getAccountNumber());
        request.setAccountName(dto.getAccountName());
        request.setStatus(RefundRequest.RefundStatus.PENDING);
        return refundRequestRepository.save(request);
    }
}
