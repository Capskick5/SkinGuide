// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service.impl;

import lombok.RequiredArgsConstructor;
import mss.orderservice.model.Order;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import mss.orderservice.service.*;

@Service
@RequiredArgsConstructor
public class DashboardService implements IDashboardService {

    private final OrderRepository orderRepository;

    private final ReturnOrderRepository returnOrderRepository;

    private final RefundRequestRepository refundRequestRepository;

    public Map<String, Object> getFinancialSummary() {
        // ---- Doanh thu ----
        List<Order> paidOrders = orderRepository.findAllPaidOrders();
        BigDecimal totalRevenue = paidOrders.stream().map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalShippingRevenue = paidOrders.stream().map(o -> o.getShippingFee() != null ? o.getShippingFee() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netProductRevenue = totalRevenue.subtract(totalShippingRevenue);
        // ---- Chi phí hoàn tiền ----
        List<RefundRequest> completedRefunds = refundRequestRepository.findCompletedRefunds();
        BigDecimal totalRefundAmount = completedRefunds.stream().map(r -> r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        // ---- Chi phí ship hoàn trả (Shop chịu) ----
        List<ReturnOrder> completedReturns = returnOrderRepository.findCompletedReturns();
        BigDecimal totalReturnShippingFee = completedReturns.stream().map(r -> r.getReturnShippingFee() != null ? r.getReturnShippingFee() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        // ---- Thống kê khiếu nại ----
        List<ReturnOrder> allReturns = returnOrderRepository.findAll();
        long totalReturns = allReturns.size();
        long refundedReturns = allReturns.stream().filter(r -> r.getStatus() == ReturnOrder.ReturnStatus.REFUNDED).count();
        long pendingReturns = allReturns.stream().filter(r -> r.getStatus() == ReturnOrder.ReturnStatus.PENDING).count();
        long receivedReturns = allReturns.stream().filter(r -> r.getStatus() == ReturnOrder.ReturnStatus.RECEIVED).count();
        // ---- Doanh thu theo 30 ngày ----
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        Map<String, BigDecimal> revenueByDay = new LinkedHashMap<>();
        Map<String, BigDecimal> refundByDay = new LinkedHashMap<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        // Khởi tạo 30 ngày với giá trị 0
        for (int i = 29; i >= 0; i--) {
            String key = LocalDateTime.now().minusDays(i).format(dayFormatter);
            revenueByDay.put(key, BigDecimal.ZERO);
            refundByDay.put(key, BigDecimal.ZERO);
        }
        paidOrders.stream().filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(thirtyDaysAgo)).forEach(o -> {
            String key = o.getCreatedAt().format(dayFormatter);
            revenueByDay.merge(key, o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO, BigDecimal::add);
        });
        completedRefunds.stream().filter(r -> r.getCreatedAt() != null && r.getCreatedAt().isAfter(thirtyDaysAgo)).forEach(r -> {
            String key = r.getCreatedAt().format(dayFormatter);
            refundByDay.merge(key, r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO, BigDecimal::add);
        });
        // Lợi nhuận ước tính (chưa trừ giá vốn, chỉ trừ chi phí hoàn tiền + phí ship hoàn trả)
        BigDecimal estimatedProfit = totalRevenue.subtract(totalRefundAmount).subtract(totalReturnShippingFee);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenue", totalRevenue);
        result.put("netProductRevenue", netProductRevenue);
        result.put("totalShippingRevenue", totalShippingRevenue);
        result.put("totalRefundAmount", totalRefundAmount);
        result.put("totalReturnShippingFee", totalReturnShippingFee);
        result.put("estimatedProfit", estimatedProfit);
        result.put("paidOrderCount", paidOrders.size());
        result.put("completedRefundCount", completedRefunds.size());
        result.put("totalReturnCount", totalReturns);
        result.put("pendingReturnCount", pendingReturns);
        result.put("refundedReturnCount", refundedReturns);
        result.put("receivedReturnCount", receivedReturns);
        result.put("revenueByDay", revenueByDay);
        result.put("refundByDay", refundByDay);
        return result;
    }
}
