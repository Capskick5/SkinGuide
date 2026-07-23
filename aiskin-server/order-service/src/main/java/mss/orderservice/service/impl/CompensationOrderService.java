package mss.orderservice.service.impl;

import lombok.RequiredArgsConstructor;
import mss.orderservice.model.CompensationOrder;
import mss.orderservice.model.Order;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.CompensationOrderRepository;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import mss.orderservice.service.CompensationInventoryClient;
import mss.orderservice.service.ICompensationOrderService;
import mss.orderservice.service.IGhnService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CompensationOrderService implements ICompensationOrderService {
    private final CompensationOrderRepository repository;
    private final ReturnOrderRepository returnOrderRepository;
    private final OrderRepository orderRepository;
    private final CompensationInventoryClient inventoryClient;
    private final IGhnService ghnService;

    public List<CompensationOrder> getAll(String status) {
        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) {
            return repository.findAll();
        }
        try {
            return repository.findByStatus(CompensationOrder.CompensationStatus.valueOf(status.toUpperCase()));
        } catch (IllegalArgumentException exception) {
            throw badRequest("Trạng thái đơn giao bù không hợp lệ");
        }
    }

    public CompensationOrder getByReturnOrderId(String returnOrderId) {
        return repository.findByReturnOrderId(returnOrderId).orElse(null);
    }

    public CompensationOrder reserveInventory(String id) {
        CompensationOrder order = find(id);
        if (Boolean.TRUE.equals(order.getInventoryReserved())) {
            return order;
        }
        requireStatus(order, CompensationOrder.CompensationStatus.PENDING);
        inventoryClient.reserve(order);
        order.setInventoryReserved(true);
        order.setStatus(CompensationOrder.CompensationStatus.INVENTORY_RESERVED);
        order.setFailureReason(null);
        return repository.save(order);
    }

    public CompensationOrder createShipment(String id) {
        CompensationOrder compensation = find(id);
        if (compensation.getTrackingCode() != null && !compensation.getTrackingCode().isBlank()) {
            return compensation;
        }
        requireStatus(compensation, CompensationOrder.CompensationStatus.INVENTORY_RESERVED,
                CompensationOrder.CompensationStatus.READY_TO_SHIP);
        Order original = orderRepository.findById(compensation.getOrderId())
                .orElseThrow(() -> conflict("Không tìm thấy đơn hàng gốc"));
        ReturnOrder returnOrder = returnOrderRepository.findById(compensation.getReturnOrderId())
                .orElseThrow(() -> conflict("Không tìm thấy khiếu nại"));
        // Không bao giờ dùng lại mã vận đơn gốc hoặc mã thu hồi cho chiều giao lại.
        returnOrder.setRedeliveryTrackingCode(null);
        returnOrder.setRedeliveryShippingFee(null);
        returnOrderRepository.save(returnOrder);
        try {
            Map<String, Object> response = ghnService.createOrder(buildShipment(original, compensation));
            String trackingCode = response == null ? null : String.valueOf(response.get("order_code"));
            if (trackingCode == null || trackingCode.isBlank() || "null".equals(trackingCode)) {
                throw new IllegalStateException("GHN không trả về mã vận đơn");
            }
            if (trackingCode.equals(original.getTrackingCode())
                    || trackingCode.equals(returnOrder.getReturnTrackingCode())) {
                throw new IllegalStateException("GHN trả về mã vận đơn đã được sử dụng cho chiều vận chuyển trước");
            }
            compensation.setCourier("GHN");
            compensation.setTrackingCode(trackingCode);
            if (response.get("total_fee") != null) {
                compensation.setShippingFee(new BigDecimal(response.get("total_fee").toString()));
            }
            compensation.setStatus(CompensationOrder.CompensationStatus.SHIPPING);
            compensation.setFailureReason(null);
            returnOrder.setStatus(ReturnOrder.ReturnStatus.REDELIVERING);
            returnOrder.setRedeliveryTrackingCode(trackingCode);
            returnOrder.setRedeliveryShippingFee(compensation.getShippingFee());
            returnOrderRepository.save(returnOrder);
            return repository.save(compensation);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            compensation.setFailureReason("Chưa tạo được vận đơn giao bù: " + exception.getMessage());
            repository.save(compensation);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Không thể tạo vận đơn giao bù", exception);
        }
    }

    @Transactional
    public CompensationOrder complete(String id) {
        CompensationOrder order = find(id);
        if (order.getStatus() == CompensationOrder.CompensationStatus.COMPLETED) {
            return order;
        }
        requireStatus(order, CompensationOrder.CompensationStatus.SHIPPING);
        if (!Boolean.TRUE.equals(order.getInventoryCommitted())) {
            inventoryClient.commit(order);
            order.setInventoryCommitted(true);
        }
        order.setStatus(CompensationOrder.CompensationStatus.COMPLETED);
        ReturnOrder returnOrder = returnOrderRepository.findById(order.getReturnOrderId())
                .orElseThrow(() -> conflict("Không tìm thấy khiếu nại"));
        returnOrder.setStatus(ReturnOrder.ReturnStatus.RESOLVED);
        returnOrderRepository.save(returnOrder);
        return repository.save(order);
    }

    public CompensationOrder cancel(String id) {
        CompensationOrder order = find(id);
        if (order.getStatus() == CompensationOrder.CompensationStatus.COMPLETED
                || order.getStatus() == CompensationOrder.CompensationStatus.SHIPPING) {
            throw conflict("Không thể hủy đơn giao bù đã giao cho đơn vị vận chuyển");
        }
        if (Boolean.TRUE.equals(order.getInventoryReserved()) && !Boolean.TRUE.equals(order.getInventoryCommitted())) {
            inventoryClient.release(order);
            order.setInventoryReserved(false);
        }
        order.setStatus(CompensationOrder.CompensationStatus.CANCELLED);
        return repository.save(order);
    }

    private Map<String, Object> buildShipment(Order original, CompensationOrder compensation) {
        Map<String, Object> data = new HashMap<>();
        data.put("payment_type_id", 1);
        data.put("required_note", "KHONGCHOXEMHANG");
        data.put("client_order_code", "REDL-" + compensation.getId());
        data.put("note", "Giao lại cho khiếu nại của đơn " + original.getOrderCode());
        data.put("to_name", original.getCustomerName());
        data.put("to_phone", original.getCustomerPhone());
        data.put("to_address", original.getShippingAddress());
        data.put("to_ward_code", original.getGhnWardCode());
        data.put("to_district_id", original.getGhnDistrictId());
        data.put("weight", 500);
        data.put("length", 15);
        data.put("width", 15);
        data.put("height", 10);
        data.put("service_type_id", 2);
        data.put("insurance_value", 0);
        data.put("cod_amount", 0);
        List<Map<String, Object>> items = new ArrayList<>();
        for (CompensationOrder.CompensationItem item : compensation.getItems()) {
            Map<String, Object> row = new HashMap<>();
            row.put("name", item.getProductName());
            row.put("code", item.getSku() == null ? item.getProductId() : item.getSku());
            row.put("quantity", item.getQuantity());
            row.put("price", 0);
            row.put("weight", 50);
            items.add(row);
        }
        data.put("items", items);
        return data;
    }

    private CompensationOrder find(String id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn giao bù"));
    }

    private void requireStatus(CompensationOrder order, CompensationOrder.CompensationStatus... statuses) {
        for (CompensationOrder.CompensationStatus status : statuses) {
            if (order.getStatus() == status) return;
        }
        throw conflict("Trạng thái đơn giao bù không cho phép thao tác này");
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
