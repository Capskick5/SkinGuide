package mss.orderservice.service;

import lombok.RequiredArgsConstructor;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class ReturnOrderService {

    private final ReturnOrderRepository returnOrderRepository;
    private final OrderRepository orderRepository;
    private final GhnService ghnService;
    private final ReturnInventoryClient returnInventoryClient;

    public ReturnOrder createReturnRequest(String orderId, Map<String, Object> request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getStatus() != Order.OrderStatus.DELIVERED) {
            throw new RuntimeException("Chỉ được yêu cầu trả hàng khi đơn đã giao thành công");
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new RuntimeException("Chỉ được yêu cầu khiếu nại/trả hàng khi đơn đã thanh toán thành công");
        }

        // Check if already requested
        if (returnOrderRepository.findByOrderId(orderId).isPresent()) {
            throw new RuntimeException("Đơn hàng này đã có yêu cầu trả hàng");
        }

        List<Map<String, Object>> reqItems = (List<Map<String, Object>>) request.get("items");
        if (reqItems == null || reqItems.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ít nhất 1 sản phẩm để trả lại");
        }

        List<ReturnOrder.ReturnItem> returnItems = new java.util.ArrayList<>();
        Map<String, Integer> requestedQuantities = new java.util.HashMap<>();
        java.math.BigDecimal totalRefund = java.math.BigDecimal.ZERO;

        for (Map<String, Object> reqItem : reqItems) {
            String productId = (String) reqItem.get("productId");
            String variantId = stringValue(reqItem.get("variantId"));
            String sku = stringValue(reqItem.get("sku"));
            String unit = (String) reqItem.get("unit");
            Integer reqQty = (Integer) reqItem.get("quantity");
            
            if (reqQty == null || reqQty <= 0) continue;

            // Tìm order item gốc
            OrderItem originalItem = findOriginalItem(order, productId, variantId, sku, unit);
            validateReturnedQuantity(requestedQuantities, originalItem, reqQty);

            if (reqQty > originalItem.getQuantity()) {
                throw new RuntimeException("Số lượng trả lớn hơn số lượng đã mua cho sản phẩm: " + originalItem.getProductName());
            }

            java.math.BigDecimal subTotal = originalItem.getUnitPrice().multiply(java.math.BigDecimal.valueOf(reqQty));
            totalRefund = totalRefund.add(subTotal);

            ReturnOrder.ReturnItem rItem = ReturnOrder.ReturnItem.builder()
                .productId(originalItem.getProductId())
                .variantId(originalItem.getVariantId())
                .sku(originalItem.getSku())
                .variantName(originalItem.getVariantName())
                .productName(originalItem.getProductName())
                .imageUrl(originalItem.getImageUrl())
                .quantity(reqQty)
                .unit(originalItem.getUnit())
                .unitPrice(originalItem.getUnitPrice())
                .subTotal(subTotal)
                .build();
            returnItems.add(rItem);
        }

        if (returnItems.isEmpty()) {
            throw new RuntimeException("Không có sản phẩm nào hợp lệ để trả");
        }

        ReturnOrder returnOrder = ReturnOrder.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .customerId(order.getCustomerId())
                .customerName(order.getCustomerName())
                .reason((String) request.get("reason"))
                .description((String) request.get("description"))
                .imageUrls((List<String>) request.get("imageUrls"))
                .items(returnItems)
                .refundAmount(totalRefund) // Chỉ tính tiền SP, không hoàn phí ship
                .status(ReturnOrder.ReturnStatus.PENDING)
                .build();

        return returnOrderRepository.save(returnOrder);
    }

    public List<ReturnOrder> getReturnsByCustomer(String customerId) {
        return returnOrderRepository.findByCustomerId(customerId);
    }

    public Page<ReturnOrder> getAllReturns(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (status == null || status.equalsIgnoreCase("ALL") || status.trim().isEmpty()) {
            return returnOrderRepository.findAll(pageable);
        } else {
            List<ReturnOrder.ReturnStatus> statusList = java.util.Arrays.stream(status.split(","))
                    .map(String::trim)
                    .map(ReturnOrder.ReturnStatus::valueOf)
                    .collect(Collectors.toList());
            return returnOrderRepository.findByStatusIn(statusList, pageable);
        }
    }

    public ReturnOrder getReturnByOrderId(String orderId) {
        return returnOrderRepository.findByOrderId(orderId).orElse(null);
    }

    public ReturnOrder updateReturnStatus(String id, String newStatusStr, String rejectReason) {
        return updateReturnStatus(id, newStatusStr, rejectReason, null);
    }

    public ReturnOrder updateReturnStatus(
            String id,
            String newStatusStr,
            String rejectReason,
            String inventoryDisposition) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Return Order not found"));
        
        ReturnOrder.ReturnStatus newStatus = ReturnOrder.ReturnStatus.valueOf(newStatusStr);
        ReturnOrder.ReturnStatus currentStatus = returnOrder.getStatus();
        if (newStatus == ReturnOrder.ReturnStatus.RECEIVED
                && currentStatus != ReturnOrder.ReturnStatus.DELIVERED
                && currentStatus != ReturnOrder.ReturnStatus.RECEIVED) {
            throw new RuntimeException("Chỉ xác nhận nhận hàng sau khi kiện trả đã giao đến kho");
        }
        if (newStatus == ReturnOrder.ReturnStatus.REFUNDED
                && currentStatus != ReturnOrder.ReturnStatus.RECEIVED
                && currentStatus != ReturnOrder.ReturnStatus.REFUNDED) {
            throw new RuntimeException("Chỉ hoàn tiền sau khi kho đã nhận hàng trả");
        }
        returnOrder.setStatus(newStatus);
        
        if (newStatus == ReturnOrder.ReturnStatus.REJECTED) {
            returnOrder.setRejectReason(rejectReason);
        }

        if (newStatus == ReturnOrder.ReturnStatus.RECEIVED) {
            ReturnOrder.InventoryDisposition disposition = inventoryDisposition == null || inventoryDisposition.isBlank()
                    ? ReturnOrder.InventoryDisposition.RESTOCK
                    : ReturnOrder.InventoryDisposition.valueOf(inventoryDisposition.trim().toUpperCase());
            if (Boolean.TRUE.equals(returnOrder.getInventoryProcessed())) {
                if (returnOrder.getInventoryDisposition() != disposition) {
                    throw new RuntimeException("Đơn trả hàng đã được xử lý kho với kết quả khác");
                }
            } else {
                ensureReturnItemVariants(returnOrder);
                returnInventoryClient.process(returnOrder, disposition);
                returnOrder.setInventoryDisposition(disposition);
                returnOrder.setInventoryProcessed(true);
            }
        }
        
        if (newStatus == ReturnOrder.ReturnStatus.APPROVED && returnOrder.getReturnTrackingCode() == null) {
            Order order = orderRepository.findById(returnOrder.getOrderId()).orElse(null);
            if (order != null) {
                try {
                    Map<String, Object> ghnData = new java.util.HashMap<>();
                    ghnData.put("payment_type_id", 2); // 2: Người nhận thanh toán phí ship
                    ghnData.put("required_note", "KHONGCHOXEMHANG");
                    ghnData.put("from_name", order.getCustomerName());
                    ghnData.put("from_phone", order.getCustomerPhone());
                    ghnData.put("from_address", order.getShippingAddress());
                    ghnData.put("from_ward_name", ""); // GHN sẽ tự match theo ward_code
                    ghnData.put("from_district_name", ""); 
                    ghnData.put("from_ward_code", order.getGhnWardCode());
                    ghnData.put("from_district_id", order.getGhnDistrictId());
                    
                    ghnData.put("to_name", "Kho SkinGuide");
                    ghnData.put("to_phone", "0987654321");
                    ghnData.put("to_address", "Đại học FPT, TPHCM, Khu Công nghệ cao");
                    ghnData.put("to_ward_code", "90753"); // Phường Tân Phú
                    ghnData.put("to_district_id", 3695); // Thành Phố Thủ Đức
                    
                    ghnData.put("weight", 500); // 500g
                    ghnData.put("length", 15);
                    ghnData.put("width", 15);
                    ghnData.put("height", 10);
                    ghnData.put("service_type_id", 2); // Chuẩn
                    ghnData.put("insurance_value", 0);
                    
                    java.util.List<java.util.Map<String, Object>> ghnItems = new java.util.ArrayList<>();
                    for (mss.orderservice.model.ReturnOrder.ReturnItem rItem : returnOrder.getItems()) {
                        java.util.Map<String, Object> map = new java.util.HashMap<>();
                        map.put("name", rItem.getProductName());
                        map.put("code", rItem.getProductId());
                        map.put("quantity", rItem.getQuantity());
                        map.put("price", rItem.getUnitPrice() != null ? rItem.getUnitPrice().intValue() : 0);
                        map.put("weight", 50);
                        ghnItems.add(map);
                    }
                    ghnData.put("items", ghnItems);

                    String trackingCode = ghnService.createOrder(ghnData);
                    returnOrder.setReturnTrackingCode(trackingCode);
                    returnOrder.setReturnCourier("GHN");
                } catch (Exception e) {
                    throw new RuntimeException("Lỗi tạo đơn hoàn trả GHN: " + e.getMessage());
                }
            }
        }
        
        ReturnOrder saved = returnOrderRepository.save(returnOrder);

        // NẾU HOÀN TIỀN THÀNH CÔNG -> Cập nhật Order chính
        if (newStatus == ReturnOrder.ReturnStatus.REFUNDED) {
            Order order = orderRepository.findById(returnOrder.getOrderId()).orElse(null);
            if (order != null) {
                order.addStatusHistory(Order.OrderStatus.RETURNED, "Đã hoàn trả hàng và hoàn tiền thành công");
                order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
                orderRepository.save(order);
            }
        }

        return saved;
    }

    public ReturnOrder updateReturnRequest(String id, Map<String, Object> request) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Return Order not found"));
        
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.PENDING && returnOrder.getStatus() != ReturnOrder.ReturnStatus.REJECTED) {
            throw new RuntimeException("Chỉ có thể sửa hoặc khiếu nại lại khi đang chờ duyệt hoặc bị từ chối");
        }
        
        Order order = orderRepository.findById(returnOrder.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));

        List<Map<String, Object>> reqItems = (List<Map<String, Object>>) request.get("items");
        if (reqItems == null || reqItems.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ít nhất 1 sản phẩm để trả lại");
        }

        List<ReturnOrder.ReturnItem> returnItems = new java.util.ArrayList<>();
        Map<String, Integer> requestedQuantities = new java.util.HashMap<>();
        java.math.BigDecimal totalRefund = java.math.BigDecimal.ZERO;

        for (Map<String, Object> reqItem : reqItems) {
            String productId = (String) reqItem.get("productId");
            String variantId = stringValue(reqItem.get("variantId"));
            String sku = stringValue(reqItem.get("sku"));
            String unit = (String) reqItem.get("unit");
            Integer reqQty = (Integer) reqItem.get("quantity");
            
            if (reqQty == null || reqQty <= 0) continue;

            OrderItem originalItem = findOriginalItem(order, productId, variantId, sku, unit);
            validateReturnedQuantity(requestedQuantities, originalItem, reqQty);

            if (reqQty > originalItem.getQuantity()) {
                throw new RuntimeException("Số lượng trả lớn hơn số lượng đã mua cho sản phẩm: " + originalItem.getProductName());
            }

            java.math.BigDecimal subTotal = originalItem.getUnitPrice().multiply(java.math.BigDecimal.valueOf(reqQty));
            totalRefund = totalRefund.add(subTotal);

            ReturnOrder.ReturnItem rItem = ReturnOrder.ReturnItem.builder()
                .productId(originalItem.getProductId())
                .variantId(originalItem.getVariantId())
                .sku(originalItem.getSku())
                .variantName(originalItem.getVariantName())
                .productName(originalItem.getProductName())
                .imageUrl(originalItem.getImageUrl())
                .quantity(reqQty)
                .unit(originalItem.getUnit())
                .unitPrice(originalItem.getUnitPrice())
                .subTotal(subTotal)
                .build();
            returnItems.add(rItem);
        }

        if (returnItems.isEmpty()) {
            throw new RuntimeException("Không có sản phẩm nào hợp lệ để trả");
        }

        returnOrder.setReason((String) request.get("reason"));
        returnOrder.setDescription((String) request.get("description"));
        returnOrder.setImageUrls((List<String>) request.get("imageUrls"));
        returnOrder.setItems(returnItems);
        returnOrder.setRefundAmount(totalRefund);

        if (returnOrder.getStatus() == ReturnOrder.ReturnStatus.REJECTED) {
            returnOrder.setStatus(ReturnOrder.ReturnStatus.PENDING);
            returnOrder.setRejectReason(null);
        }

        return returnOrderRepository.save(returnOrder);
    }

    private OrderItem findOriginalItem(
            Order order,
            String productId,
            String variantId,
            String sku,
            String unit) {
        if (productId == null || productId.isBlank()) {
            throw new RuntimeException("Thiếu productId của sản phẩm trả lại");
        }
        List<OrderItem> candidates = order.getItems().stream()
                .filter(item -> Objects.equals(item.getProductId(), productId))
                .filter(item -> variantId == null || Objects.equals(item.getVariantId(), variantId))
                .filter(item -> sku == null || Objects.equals(item.getSku(), sku))
                .filter(item -> variantId != null || sku != null || Objects.equals(item.getUnit(), unit))
                .toList();
        if (candidates.size() != 1) {
            if (candidates.size() > 1) {
                throw new RuntimeException("Vui lòng chọn đúng biến thể/SKU của sản phẩm: " + productId);
            }
            throw new RuntimeException("Sản phẩm hoặc biến thể không thuộc đơn hàng: " + productId);
        }
        return candidates.getFirst();
    }

    private void validateReturnedQuantity(
            Map<String, Integer> requestedQuantities,
            OrderItem originalItem,
            int requestedQuantity) {
        String key = originalItem.getVariantId() != null
                ? originalItem.getProductId() + ":" + originalItem.getVariantId()
                : originalItem.getProductId() + ":" + originalItem.getSku() + ":" + originalItem.getUnit();
        int totalRequested = requestedQuantities.merge(key, requestedQuantity, Integer::sum);
        if (totalRequested > originalItem.getQuantity()) {
            throw new RuntimeException("Số lượng trả lớn hơn số lượng đã mua cho sản phẩm: "
                    + originalItem.getProductName());
        }
    }

    private void ensureReturnItemVariants(ReturnOrder returnOrder) {
        if (returnOrder.getItems() == null || returnOrder.getItems().stream()
                .allMatch(item -> item.getVariantId() != null && !item.getVariantId().isBlank())) {
            return;
        }
        Order order = orderRepository.findById(returnOrder.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));
        for (ReturnOrder.ReturnItem item : returnOrder.getItems()) {
            if (item.getVariantId() != null && !item.getVariantId().isBlank()) {
                continue;
            }
            OrderItem original = findOriginalItem(
                    order, item.getProductId(), null, item.getSku(), item.getUnit());
            item.setVariantId(original.getVariantId());
            item.setSku(original.getSku());
            item.setVariantName(original.getVariantName());
        }
    }

    private String stringValue(Object value) {
        return value instanceof String string && !string.isBlank() ? string.trim() : null;
    }

    public void deleteReturnRequest(String id) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Return Order not found"));
        
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể xóa khiếu nại khi đang chờ duyệt");
        }
        
        returnOrderRepository.delete(returnOrder);
    }

    public ReturnOrder updateReturnTracking(String id, String courier, String trackingCode) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Return Order not found"));

        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.APPROVED) {
            throw new RuntimeException("Chỉ có thể cập nhật mã vận đơn khi khiếu nại đã được duyệt (Chờ khách gửi hàng)");
        }

        returnOrder.setReturnCourier(courier);
        returnOrder.setReturnTrackingCode(trackingCode);

        return returnOrderRepository.save(returnOrder);
    }
    
    public void syncGhnReturnOrderStatus() {
        List<ReturnOrder> activeReturns = returnOrderRepository.findActiveGhnReturns();
        for (ReturnOrder returnOrder : activeReturns) {
            try {
                Map<String, Object> detail = ghnService.getOrderDetail(returnOrder.getReturnTrackingCode());
                if (detail != null && detail.containsKey("status")) {
                    String ghnStatus = (String) detail.get("status");
                    
                    ReturnOrder.ReturnStatus newStatus = null;
                    switch (ghnStatus) {
                        case "ready_to_pick":
                            newStatus = ReturnOrder.ReturnStatus.READY_TO_PICK;
                            break;
                        case "picking":
                            newStatus = ReturnOrder.ReturnStatus.PICKING;
                            break;
                        case "picked":
                            newStatus = ReturnOrder.ReturnStatus.PICKED;
                            break;
                        case "storing":
                            newStatus = ReturnOrder.ReturnStatus.STORING;
                            break;
                        case "sorting":
                            newStatus = ReturnOrder.ReturnStatus.SORTING;
                            break;
                        case "transporting":
                            newStatus = ReturnOrder.ReturnStatus.TRANSPORTING;
                            break;
                        case "delivering":
                            newStatus = ReturnOrder.ReturnStatus.DELIVERING;
                            break;
                        case "delivered":
                        case "deliveried":
                            newStatus = ReturnOrder.ReturnStatus.DELIVERED;
                            break;
                    }
                    
                    boolean changed = false;
                    if (newStatus != null && newStatus != returnOrder.getStatus()) {
                        returnOrder.setStatus(newStatus);
                        changed = true;
                    }
                    
                    // Lấy phí ship nếu có
                    if (detail.containsKey("logistics") && detail.get("logistics") instanceof Map) {
                        Map<String, Object> logistics = (Map<String, Object>) detail.get("logistics");
                        if (logistics.containsKey("fee")) {
                            Number feeObj = (Number) logistics.get("fee");
                            java.math.BigDecimal fee = new java.math.BigDecimal(feeObj.toString());
                            if (returnOrder.getReturnShippingFee() == null || returnOrder.getReturnShippingFee().compareTo(fee) != 0) {
                                returnOrder.setReturnShippingFee(fee);
                                changed = true;
                            }
                        }
                    } else if (detail.containsKey("total_fee")) {
                        Number feeObj = (Number) detail.get("total_fee");
                        java.math.BigDecimal fee = new java.math.BigDecimal(feeObj.toString());
                        if (returnOrder.getReturnShippingFee() == null || returnOrder.getReturnShippingFee().compareTo(fee) != 0) {
                            returnOrder.setReturnShippingFee(fee);
                            changed = true;
                        }
                    }
                    
                    if (changed) {
                        returnOrderRepository.save(returnOrder);
                    }
                }
            } catch (Exception e) {
                // Log error if needed
            }
        }
    }
}
