// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service.impl;

import lombok.RequiredArgsConstructor;
import mss.orderservice.model.CompensationOrder;
import mss.orderservice.model.Order;
import mss.orderservice.model.RefundRequest;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.RefundRequestRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import mss.orderservice.service.*;

@Service
@RequiredArgsConstructor
public class DashboardService implements IDashboardService {

    private final OrderRepository orderRepository;

    private final ReturnOrderRepository returnOrderRepository;

    private final RefundRequestRepository refundRequestRepository;

    private final CompensationOrderRepository compensationOrderRepository;

    public Map<String, Object> getFinancialSummary() {
        List<Order> paidOrders = orderRepository.findAllPaidOrders();
        List<ReturnOrder> allReturns = returnOrderRepository.findAll();
        List<RefundRequest> allRefunds = refundRequestRepository.findAll();
        List<CompensationOrder> allCompensations = compensationOrderRepository.findAll();

        List<RefundRequest> completedRefunds = allRefunds.stream()
                .filter(refund -> refund.getStatus() == RefundRequest.RefundStatus.COMPLETED)
                .toList();
        List<RefundRequest> pendingRefunds = allRefunds.stream()
                .filter(refund -> refund.getStatus() == RefundRequest.RefundStatus.PENDING)
                .toList();

        BigDecimal grossRevenue = sumOrders(paidOrders, Order::getTotalAmount);
        BigDecimal shippingCollected = sumOrders(paidOrders, Order::getShippingFee);
        BigDecimal productRevenue = grossRevenue.subtract(shippingCollected);
        BigDecimal completedRefundAmount = sumRefunds(completedRefunds);
        BigDecimal pendingRefundAmount = sumRefunds(pendingRefunds);

        // Đơn gốc chỉ phát sinh chi phí GHN khi đã có mã vận đơn.
        List<Order> shippedOriginalOrders = paidOrders.stream()
                .filter(order -> hasText(order.getTrackingCode()))
                .toList();
        BigDecimal originalShippingCost = sumOrders(shippedOriginalOrders, this::originalShippingCost);

        // Phí đã được GHN trả về khi tạo vận đơn vẫn là chi phí, kể cả kiện đang đi
        // hoặc giao thất bại; không chờ hoàn tất mới ghi nhận.
        List<ReturnOrder> returnShipments = allReturns.stream()
                .filter(returnOrder -> returnOrder.getReturnShippingFee() != null
                        || hasText(returnOrder.getReturnTrackingCode()))
                .toList();
        BigDecimal returnShippingCost = returnShipments.stream()
                .map(returnOrder -> zeroIfNull(returnOrder.getReturnShippingFee()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CompensationOrder> redeliveryShipments = allCompensations.stream()
                .filter(compensation -> compensation.getShippingFee() != null
                        || hasText(compensation.getTrackingCode()))
                .toList();
        BigDecimal redeliveryShippingCost = redeliveryShipments.stream()
                .map(compensation -> zeroIfNull(compensation.getShippingFee()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalShippingCost = originalShippingCost
                .add(returnShippingCost)
                .add(redeliveryShippingCost);
        BigDecimal shopShippingSubsidy = totalShippingCost.subtract(shippingCollected);
        BigDecimal netCashAfterRefundAndShipping = grossRevenue
                .subtract(completedRefundAmount)
                .subtract(totalShippingCost);

        Map<String, Long> claimTypeCounts = enumCounts(ReturnOrder.ClaimType.values());
        Map<String, Long> returnStatusCounts = enumCounts(ReturnOrder.ReturnStatus.values());
        for (ReturnOrder returnOrder : allReturns) {
            increment(claimTypeCounts, returnOrder.getClaimType());
            increment(returnStatusCounts, returnOrder.getStatus());
        }

        Map<String, Long> compensationStatusCounts = enumCounts(CompensationOrder.CompensationStatus.values());
        for (CompensationOrder compensation : allCompensations) {
            increment(compensationStatusCounts, compensation.getStatus());
        }

        long pendingReturnCount = countReturns(allReturns, ReturnOrder.ReturnStatus.PENDING);
        long inspectionReturnCount = allReturns.stream()
                .filter(item -> item.getStatus() == ReturnOrder.ReturnStatus.DELIVERED
                        || item.getStatus() == ReturnOrder.ReturnStatus.INSPECTING)
                .count();
        long waitingRefundReturnCount = allReturns.stream()
                .filter(item -> item.getStatus() == ReturnOrder.ReturnStatus.REFUND_PENDING
                        || item.getStatus() == ReturnOrder.ReturnStatus.REFUND_PROCESSING)
                .count();
        long activeRedeliveryCount = allCompensations.stream()
                .filter(item -> item.getStatus() != CompensationOrder.CompensationStatus.COMPLETED
                        && item.getStatus() != CompensationOrder.CompensationStatus.CANCELLED
                        && item.getStatus() != CompensationOrder.CompensationStatus.FAILED)
                .count();

        LocalDate today = LocalDate.now();
        LocalDate firstDashboardDay = today.minusDays(29);
        Map<String, BigDecimal> revenueByDay = new LinkedHashMap<>();
        Map<String, BigDecimal> refundByDay = new LinkedHashMap<>();
        Map<String, BigDecimal> originalShippingCostByDay = new LinkedHashMap<>();
        Map<String, BigDecimal> returnShippingCostByDay = new LinkedHashMap<>();
        Map<String, BigDecimal> redeliveryShippingCostByDay = new LinkedHashMap<>();
        Map<String, BigDecimal> shippingCostByDay = new LinkedHashMap<>();
        Map<String, BigDecimal> netCashByDay = new LinkedHashMap<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (int i = 29; i >= 0; i--) {
            String key = today.minusDays(i).format(dayFormatter);
            revenueByDay.put(key, BigDecimal.ZERO);
            refundByDay.put(key, BigDecimal.ZERO);
            originalShippingCostByDay.put(key, BigDecimal.ZERO);
            returnShippingCostByDay.put(key, BigDecimal.ZERO);
            redeliveryShippingCostByDay.put(key, BigDecimal.ZERO);
        }

        paidOrders.forEach(order -> mergeByDay(revenueByDay, accountingTime(order), order.getTotalAmount(),
                firstDashboardDay, dayFormatter));
        shippedOriginalOrders.forEach(order -> mergeByDay(originalShippingCostByDay, shippingAccountingTime(order),
                originalShippingCost(order), firstDashboardDay, dayFormatter));
        completedRefunds.forEach(refund -> mergeByDay(refundByDay, accountingTime(refund),
                refund.getAmount(), firstDashboardDay, dayFormatter));
        returnShipments.forEach(returnOrder -> mergeByDay(returnShippingCostByDay,
                shippingAccountingTime(returnOrder),
                returnOrder.getReturnShippingFee(), firstDashboardDay, dayFormatter));
        redeliveryShipments.forEach(compensation -> mergeByDay(redeliveryShippingCostByDay,
                shippingAccountingTime(compensation), compensation.getShippingFee(),
                firstDashboardDay, dayFormatter));

        for (String day : revenueByDay.keySet()) {
            BigDecimal dailyShipping = originalShippingCostByDay.get(day)
                    .add(returnShippingCostByDay.get(day))
                    .add(redeliveryShippingCostByDay.get(day));
            shippingCostByDay.put(day, dailyShipping);
            netCashByDay.put(day, revenueByDay.get(day).subtract(refundByDay.get(day)).subtract(dailyShipping));
        }

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("grossRevenue", grossRevenue);
        result.put("productRevenue", productRevenue);
        result.put("shippingCollected", shippingCollected);
        result.put("completedRefundAmount", completedRefundAmount);
        result.put("pendingRefundAmount", pendingRefundAmount);
        result.put("originalShippingCost", originalShippingCost);
        result.put("returnShippingCost", returnShippingCost);
        result.put("redeliveryShippingCost", redeliveryShippingCost);
        result.put("totalShippingCost", totalShippingCost);
        result.put("shopShippingSubsidy", shopShippingSubsidy);
        result.put("netCashAfterRefundAndShipping", netCashAfterRefundAndShipping);
        result.put("averageShippingCostPerShipment", average(totalShippingCost,
                shippedOriginalOrders.size() + returnShipments.size() + redeliveryShipments.size()));

        result.put("paidOrderCount", paidOrders.size());
        result.put("completedRefundCount", completedRefunds.size());
        result.put("pendingRefundCount", pendingRefunds.size());
        result.put("originalShipmentCount", shippedOriginalOrders.size());
        result.put("returnShipmentCount", returnShipments.size());
        result.put("redeliveryShipmentCount", redeliveryShipments.size());
        result.put("totalReturnCount", allReturns.size());
        result.put("pendingReturnCount", pendingReturnCount);
        result.put("inspectionReturnCount", inspectionReturnCount);
        result.put("waitingRefundReturnCount", waitingRefundReturnCount);
        result.put("refundedReturnCount", countReturns(allReturns, ReturnOrder.ReturnStatus.REFUNDED));
        result.put("rejectedReturnCount", countReturns(allReturns, ReturnOrder.ReturnStatus.REJECTED)
                + countReturns(allReturns, ReturnOrder.ReturnStatus.INSPECTION_FAILED));
        result.put("resolvedReturnCount", countReturns(allReturns, ReturnOrder.ReturnStatus.RESOLVED));
        result.put("totalCompensationCount", allCompensations.size());
        result.put("activeRedeliveryCount", activeRedeliveryCount);
        result.put("completedRedeliveryCount", countCompensations(allCompensations,
                CompensationOrder.CompensationStatus.COMPLETED));
        result.put("returnedRedeliveryCount", countCompensations(allCompensations,
                CompensationOrder.CompensationStatus.RETURNED_INSPECTION));
        result.put("claimTypeCounts", claimTypeCounts);
        result.put("returnStatusCounts", returnStatusCounts);
        result.put("compensationStatusCounts", compensationStatusCounts);
        result.put("revenueByDay", revenueByDay);
        result.put("refundByDay", refundByDay);
        result.put("originalShippingCostByDay", originalShippingCostByDay);
        result.put("returnShippingCostByDay", returnShippingCostByDay);
        result.put("redeliveryShippingCostByDay", redeliveryShippingCostByDay);
        result.put("shippingCostByDay", shippingCostByDay);
        result.put("netCashByDay", netCashByDay);

        // Giữ tương thích với giao diện/consumer cũ trong thời gian chuyển đổi.
        result.put("totalRevenue", grossRevenue);
        result.put("netProductRevenue", productRevenue);
        result.put("totalShippingRevenue", shippingCollected);
        result.put("totalRefundAmount", completedRefundAmount);
        result.put("totalReturnShippingFee", returnShippingCost);
        result.put("estimatedProfit", netCashAfterRefundAndShipping);
        result.put("receivedReturnCount", inspectionReturnCount);
        return result;
    }

    private BigDecimal sumOrders(List<Order> orders,
                                 java.util.function.Function<Order, BigDecimal> valueExtractor) {
        return orders.stream()
                .map(valueExtractor)
                .map(this::zeroIfNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumRefunds(List<RefundRequest> refunds) {
        return refunds.stream()
                .map(RefundRequest::getAmount)
                .map(this::zeroIfNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal originalShippingCost(Order order) {
        return order.getActualShippingFee() != null
                ? order.getActualShippingFee()
                : zeroIfNull(order.getShippingFee());
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal average(BigDecimal total, int count) {
        return count == 0
                ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(count), 0, RoundingMode.HALF_UP);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private <E extends Enum<E>> Map<String, Long> enumCounts(E[] values) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (E value : values) {
            counts.put(value.name(), 0L);
        }
        return counts;
    }

    private void increment(Map<String, Long> counts, Enum<?> value) {
        if (value != null) {
            counts.merge(value.name(), 1L, Long::sum);
        }
    }

    private long countReturns(List<ReturnOrder> returns, ReturnOrder.ReturnStatus status) {
        return returns.stream().filter(item -> item.getStatus() == status).count();
    }

    private long countCompensations(List<CompensationOrder> compensations,
                                    CompensationOrder.CompensationStatus status) {
        return compensations.stream().filter(item -> item.getStatus() == status).count();
    }

    private LocalDateTime accountingTime(Order order) {
        return order.getPaidAt() != null ? order.getPaidAt() : order.getCreatedAt();
    }

    private LocalDateTime accountingTime(RefundRequest refund) {
        return refund.getUpdatedAt() != null ? refund.getUpdatedAt() : refund.getCreatedAt();
    }

    private LocalDateTime shippingAccountingTime(Order order) {
        return order.getShipmentCreatedAt() != null ? order.getShipmentCreatedAt() : accountingTime(order);
    }

    private LocalDateTime shippingAccountingTime(ReturnOrder returnOrder) {
        return returnOrder.getReturnShipmentCreatedAt() != null
                ? returnOrder.getReturnShipmentCreatedAt()
                : returnOrder.getCreatedAt();
    }

    private LocalDateTime shippingAccountingTime(CompensationOrder compensation) {
        return compensation.getShipmentCreatedAt() != null
                ? compensation.getShipmentCreatedAt()
                : compensation.getCreatedAt();
    }

    private void mergeByDay(Map<String, BigDecimal> target, LocalDateTime time, BigDecimal value,
                            LocalDate firstDashboardDay, DateTimeFormatter formatter) {
        if (time == null || time.toLocalDate().isBefore(firstDashboardDay)
                || time.toLocalDate().isAfter(LocalDate.now())) {
            return;
        }
        String key = time.format(formatter);
        if (target.containsKey(key)) {
            target.merge(key, zeroIfNull(value), BigDecimal::add);
        }
    }
}
