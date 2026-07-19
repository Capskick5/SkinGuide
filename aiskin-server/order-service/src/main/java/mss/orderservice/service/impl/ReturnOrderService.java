// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.dto.ReturnItemRequest;
import mss.orderservice.dto.ReturnRequest;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.model.ReturnOrder;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ReturnOrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import mss.orderservice.service.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnOrderService implements IReturnOrderService {

    private final ReturnOrderRepository returnOrderRepository;

    private final OrderRepository orderRepository;

    private final IGhnService ghnService;

    private final ReturnInventoryClient returnInventoryClient;

    public ReturnOrder createReturnRequest(String orderId, ReturnRequest request) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> notFound("Không tìm thấy đơn hàng"));
        if (order.getStatus() != Order.OrderStatus.DELIVERED) {
            throw badRequest("Chỉ được yêu cầu trả hàng khi đơn đã giao thành công");
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw badRequest("Chỉ được yêu cầu trả hàng khi đơn đã thanh toán thành công");
        }
        if (returnOrderRepository.findByOrderId(orderId).isPresent()) {
            throw conflict("Đơn hàng này đã có yêu cầu trả hàng");
        }
        ReturnCalculation calculation = calculateReturn(order, request.items());
        ReturnOrder returnOrder = ReturnOrder.builder().orderId(order.getId()).orderCode(order.getOrderCode()).customerId(order.getCustomerId()).customerName(order.getCustomerName()).reason(request.reason().trim()).description(request.description().trim()).imageUrls(List.copyOf(request.imageUrls())).items(calculation.items()).refundAmount(calculation.totalRefund()).status(ReturnOrder.ReturnStatus.PENDING).build();
        return returnOrderRepository.save(returnOrder);
    }

    public List<ReturnOrder> getReturnsByCustomer(String customerId) {
        return returnOrderRepository.findByCustomerId(customerId);
    }

    public Page<ReturnOrder> getAllReturns(int page, int size, String status) {
        if (page < 0 || size < 1 || size > 100) {
            throw badRequest("Phân trang không hợp lệ");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (status == null || status.equalsIgnoreCase("ALL") || status.trim().isEmpty()) {
            return returnOrderRepository.findAll(pageable);
        }
        try {
            List<ReturnOrder.ReturnStatus> statusList = Arrays.stream(status.split(",")).map(String::trim).map(String::toUpperCase).map(ReturnOrder.ReturnStatus::valueOf).collect(Collectors.toList());
            return returnOrderRepository.findByStatusIn(statusList, pageable);
        } catch (IllegalArgumentException exception) {
            throw badRequest("Trạng thái lọc không hợp lệ");
        }
    }

    public ReturnOrder getReturnByOrderId(String orderId) {
        return returnOrderRepository.findByOrderId(orderId).orElse(null);
    }

    public ReturnOrder updateReturnStatus(String id, ReturnOrder.ReturnStatus newStatus, String rejectReason, ReturnOrder.InventoryDisposition inventoryDisposition) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id).orElseThrow(() -> notFound("Không tìm thấy yêu cầu trả hàng"));
        ReturnOrder.ReturnStatus currentStatus = returnOrder.getStatus();
        if (newStatus == currentStatus) {
            validateRepeatedStatus(returnOrder, inventoryDisposition);
            return returnOrder;
        }
        validateAdminTransition(currentStatus, newStatus, rejectReason, inventoryDisposition);
        returnOrder.setStatus(newStatus);
        if (newStatus == ReturnOrder.ReturnStatus.REJECTED) {
            returnOrder.setRejectReason(rejectReason.trim());
        }
        if (newStatus == ReturnOrder.ReturnStatus.RECEIVED) {
            if (Boolean.TRUE.equals(returnOrder.getInventoryProcessed())) {
                if (returnOrder.getInventoryDisposition() != inventoryDisposition) {
                    throw conflict("Đơn trả hàng đã được xử lý kho với kết quả khác");
                }
            } else {
                ensureReturnItemVariants(returnOrder);
                returnInventoryClient.process(returnOrder, inventoryDisposition);
                returnOrder.setInventoryDisposition(inventoryDisposition);
                returnOrder.setInventoryProcessed(true);
            }
        }
        if (newStatus == ReturnOrder.ReturnStatus.DELIVERING && returnOrder.getReturnTrackingCode() == null) {
            tryCreateGhnReturnShipment(returnOrder);
        }
        return returnOrderRepository.save(returnOrder);
    }

    private void tryCreateGhnReturnShipment(ReturnOrder returnOrder) {
        Order order = orderRepository.findById(returnOrder.getOrderId()).orElse(null);
        if (order == null) {
            returnOrder.setReturnShipmentError("Không tìm thấy đơn hàng gốc để tạo vận đơn");
            return;
        }
        try {
            Map<String, Object> ghnData = buildGhnReturnRequest(order, returnOrder);
            Map<String, Object> ghnResponse = ghnService.createOrder(ghnData);
            String trackingCode = ghnResponse != null ? (String) ghnResponse.get("order_code") : null;
            if (trackingCode == null || trackingCode.isBlank()) {
                throw new IllegalStateException("GHN returned an empty tracking code");
            }
            if (ghnResponse.containsKey("total_fee")) {
                Number feeObj = (Number) ghnResponse.get("total_fee");
                returnOrder.setReturnShippingFee(new BigDecimal(feeObj.toString()));
            }
            returnOrder.setReturnTrackingCode(trackingCode);
            returnOrder.setReturnCourier("GHN");
            returnOrder.setReturnShipmentError(null);
        } catch (Exception exception) {
            log.warn("Return {} was approved but GHN shipment creation failed", returnOrder.getId(), exception);
            returnOrder.setReturnShipmentError("Chưa tạo được vận đơn GHN. Admin có thể xác nhận nhận hàng thủ công.");
        }
    }

    private Map<String, Object> buildGhnReturnRequest(Order order, ReturnOrder returnOrder) {
        Map<String, Object> ghnData = new HashMap<>();
        ghnData.put("payment_type_id", 2);
        ghnData.put("required_note", "KHONGCHOXEMHANG");
        ghnData.put("from_name", order.getCustomerName());
        ghnData.put("from_phone", order.getCustomerPhone());
        ghnData.put("from_address", order.getShippingAddress());
        ghnData.put("from_ward_name", "");
        ghnData.put("from_district_name", "");
        ghnData.put("from_ward_code", order.getGhnWardCode());
        ghnData.put("from_district_id", order.getGhnDistrictId());
        ghnData.put("to_name", "Kho SkinGuide");
        ghnData.put("to_phone", "0987654321");
        ghnData.put("to_address", "Đại học FPT, TPHCM, Khu Công nghệ cao");
        ghnData.put("to_ward_code", "90753");
        ghnData.put("to_district_id", 3695);
        ghnData.put("weight", 500);
        ghnData.put("length", 15);
        ghnData.put("width", 15);
        ghnData.put("height", 10);
        ghnData.put("service_type_id", 2);
        ghnData.put("insurance_value", 0);
        List<Map<String, Object>> ghnItems = new ArrayList<>();
        for (ReturnOrder.ReturnItem returnItem : returnOrder.getItems()) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", returnItem.getProductName());
            item.put("code", returnItem.getProductId());
            item.put("quantity", returnItem.getQuantity());
            item.put("price", returnItem.getUnitPrice() == null ? 0 : returnItem.getUnitPrice().intValue());
            item.put("weight", 50);
            ghnItems.add(item);
        }
        ghnData.put("items", ghnItems);
        return ghnData;
    }

    public ReturnOrder updateReturnRequest(String id, ReturnRequest request) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id).orElseThrow(() -> notFound("Không tìm thấy yêu cầu trả hàng"));
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.PENDING && returnOrder.getStatus() != ReturnOrder.ReturnStatus.REJECTED) {
            throw conflict("Chỉ có thể sửa yêu cầu khi đang chờ duyệt hoặc bị từ chối");
        }
        Order order = orderRepository.findById(returnOrder.getOrderId()).orElseThrow(() -> notFound("Không tìm thấy đơn hàng gốc"));
        ReturnCalculation calculation = calculateReturn(order, request.items());
        returnOrder.setReason(request.reason().trim());
        returnOrder.setDescription(request.description().trim());
        returnOrder.setImageUrls(List.copyOf(request.imageUrls()));
        returnOrder.setItems(calculation.items());
        returnOrder.setRefundAmount(calculation.totalRefund());
        if (returnOrder.getStatus() == ReturnOrder.ReturnStatus.REJECTED) {
            returnOrder.setStatus(ReturnOrder.ReturnStatus.PENDING);
            returnOrder.setRejectReason(null);
        }
        return returnOrderRepository.save(returnOrder);
    }

    private ReturnCalculation calculateReturn(Order order, List<ReturnItemRequest> requestedItems) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw conflict("Đơn hàng gốc không có sản phẩm để trả");
        }
        if (requestedItems == null || requestedItems.isEmpty()) {
            throw badRequest("Cần chọn ít nhất một sản phẩm để trả");
        }
        List<ReturnOrder.ReturnItem> returnItems = new ArrayList<>();
        Map<String, Integer> requestedQuantities = new HashMap<>();
        BigDecimal totalRefund = BigDecimal.ZERO;
        for (ReturnItemRequest requestedItem : requestedItems) {
            OrderItem originalItem = findOriginalItem(order, requestedItem.productId().trim(), normalized(requestedItem.variantId()), normalized(requestedItem.sku()), normalized(requestedItem.unit()));
            validateReturnedQuantity(requestedQuantities, originalItem, requestedItem.quantity());
            if (originalItem.getUnitPrice() == null) {
                throw conflict("Đơn hàng gốc thiếu giá sản phẩm: " + originalItem.getProductName());
            }
            BigDecimal subTotal = originalItem.getUnitPrice().multiply(BigDecimal.valueOf(requestedItem.quantity()));
            totalRefund = totalRefund.add(subTotal);
            returnItems.add(ReturnOrder.ReturnItem.builder().productId(originalItem.getProductId()).variantId(originalItem.getVariantId()).sku(originalItem.getSku()).variantName(originalItem.getVariantName()).productName(originalItem.getProductName()).imageUrl(originalItem.getImageUrl()).quantity(requestedItem.quantity()).unit(originalItem.getUnit()).unitPrice(originalItem.getUnitPrice()).subTotal(subTotal).build());
        }
        return new ReturnCalculation(List.copyOf(returnItems), totalRefund);
    }

    private void validateAdminTransition(ReturnOrder.ReturnStatus currentStatus, ReturnOrder.ReturnStatus newStatus, String rejectReason, ReturnOrder.InventoryDisposition inventoryDisposition) {
        boolean pendingDecision = currentStatus == ReturnOrder.ReturnStatus.PENDING && (newStatus == ReturnOrder.ReturnStatus.DELIVERING || newStatus == ReturnOrder.ReturnStatus.REJECTED);
        boolean receivingPhysicalReturn = isReturnInTransit(currentStatus) && newStatus == ReturnOrder.ReturnStatus.RECEIVED;
        if (!pendingDecision && !receivingPhysicalReturn) {
            if (newStatus == ReturnOrder.ReturnStatus.REFUNDED) {
                throw conflict("Hãy hoàn tiền qua yêu cầu hoàn tiền đã được khách cung cấp thông tin ngân hàng");
            }
            throw conflict("Không thể chuyển yêu cầu trả hàng từ " + currentStatus + " sang " + newStatus);
        }
        if (newStatus == ReturnOrder.ReturnStatus.REJECTED && (rejectReason == null || rejectReason.isBlank())) {
            throw badRequest("Cần nhập lý do từ chối yêu cầu trả hàng");
        }
        if (newStatus == ReturnOrder.ReturnStatus.RECEIVED && inventoryDisposition == null) {
            throw badRequest("Cần chọn nhập lại kho hoặc đánh dấu hàng hỏng");
        }
    }

    private void validateRepeatedStatus(ReturnOrder returnOrder, ReturnOrder.InventoryDisposition inventoryDisposition) {
        if (returnOrder.getStatus() == ReturnOrder.ReturnStatus.RECEIVED && inventoryDisposition != null && returnOrder.getInventoryDisposition() != inventoryDisposition) {
            throw conflict("Đơn trả hàng đã được xử lý kho với kết quả khác");
        }
    }

    private boolean isReturnInTransit(ReturnOrder.ReturnStatus status) {
        return switch(status) {
            case DELIVERING, DELIVERED ->
                true;
            default ->
                false;
        };
    }

    private OrderItem findOriginalItem(Order order, String productId, String variantId, String sku, String unit) {
        if (productId == null || productId.isBlank()) {
            throw badRequest("Thiếu productId của sản phẩm trả lại");
        }
        List<OrderItem> candidates = order.getItems().stream().filter(item -> Objects.equals(item.getProductId(), productId)).filter(item -> variantId == null || Objects.equals(item.getVariantId(), variantId)).filter(item -> sku == null || Objects.equals(item.getSku(), sku)).filter(item -> variantId != null || sku != null || Objects.equals(item.getUnit(), unit)).toList();
        if (candidates.size() != 1) {
            if (candidates.size() > 1) {
                throw badRequest("Vui lòng chọn đúng biến thể/SKU của sản phẩm: " + productId);
            }
            throw badRequest("Sản phẩm hoặc biến thể không thuộc đơn hàng: " + productId);
        }
        return candidates.getFirst();
    }

    private void validateReturnedQuantity(Map<String, Integer> requestedQuantities, OrderItem originalItem, int requestedQuantity) {
        String key = originalItem.getVariantId() != null ? originalItem.getProductId() + ":" + originalItem.getVariantId() : originalItem.getProductId() + ":" + originalItem.getSku() + ":" + originalItem.getUnit();
        int totalRequested = requestedQuantities.merge(key, requestedQuantity, Integer::sum);
        if (originalItem.getQuantity() == null || totalRequested > originalItem.getQuantity()) {
            throw badRequest("Số lượng trả lớn hơn số lượng đã mua cho sản phẩm: " + originalItem.getProductName());
        }
    }

    private void ensureReturnItemVariants(ReturnOrder returnOrder) {
        if (returnOrder.getItems() == null || returnOrder.getItems().stream().allMatch(item -> item.getVariantId() != null && !item.getVariantId().isBlank())) {
            return;
        }
        Order order = orderRepository.findById(returnOrder.getOrderId()).orElseThrow(() -> notFound("Không tìm thấy đơn hàng gốc"));
        for (ReturnOrder.ReturnItem item : returnOrder.getItems()) {
            if (item.getVariantId() != null && !item.getVariantId().isBlank()) {
                continue;
            }
            OrderItem original = findOriginalItem(order, item.getProductId(), null, item.getSku(), item.getUnit());
            item.setVariantId(original.getVariantId());
            item.setSku(original.getSku());
            item.setVariantName(original.getVariantName());
        }
    }

    private String normalized(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public void deleteReturnRequest(String id) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id).orElseThrow(() -> notFound("Không tìm thấy yêu cầu trả hàng"));
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.PENDING) {
            throw conflict("Chỉ có thể xóa yêu cầu trả hàng khi đang chờ duyệt");
        }
        returnOrderRepository.delete(returnOrder);
    }

    public ReturnOrder updateReturnTracking(String id, String courier, String trackingCode) {
        ReturnOrder returnOrder = returnOrderRepository.findById(id).orElseThrow(() -> notFound("Không tìm thấy yêu cầu trả hàng"));
        if (returnOrder.getStatus() != ReturnOrder.ReturnStatus.DELIVERING) {
            throw conflict("Chỉ có thể cập nhật mã vận đơn sau khi yêu cầu trả hàng được duyệt (Đang vận chuyển hoàn)");
        }
        String normalizedTrackingCode = trackingCode.trim();
        if (returnOrder.getReturnTrackingCode() != null && !returnOrder.getReturnTrackingCode().equals(normalizedTrackingCode)) {
            throw conflict("Yêu cầu trả hàng đã có mã vận đơn và không thể thay thế");
        }
        returnOrder.setReturnCourier(courier.trim());
        returnOrder.setReturnTrackingCode(normalizedTrackingCode);
        returnOrder.setReturnShipmentError(null);
        return returnOrderRepository.save(returnOrder);
    }

    public void syncGhnReturnOrderStatus() {
        List<ReturnOrder> activeReturns = returnOrderRepository.findActiveGhnReturns();
        for (ReturnOrder returnOrder : activeReturns) {
            try {
                Map<String, Object> detail = ghnService.getOrderDetail(returnOrder.getReturnTrackingCode());
                if (detail != null && detail.containsKey("status")) {
                    ReturnOrder.ReturnStatus newStatus = mapGhnStatus(String.valueOf(detail.get("status")));
                    boolean changed = false;
                    if (newStatus != null && isForwardShippingStatus(returnOrder.getStatus(), newStatus)) {
                        returnOrder.setStatus(newStatus);
                        changed = true;
                    }
                    // Lấy phí ship nếu có
                    if (detail.containsKey("logistics") && detail.get("logistics") instanceof Map) {
                        Map<String, Object> logistics = (Map<String, Object>) detail.get("logistics");
                        if (logistics.containsKey("fee")) {
                            Number feeObj = (Number) logistics.get("fee");
                            BigDecimal fee = new BigDecimal(feeObj.toString());
                            if (returnOrder.getReturnShippingFee() == null || returnOrder.getReturnShippingFee().compareTo(fee) != 0) {
                                returnOrder.setReturnShippingFee(fee);
                                changed = true;
                            }
                        }
                    } else if (detail.containsKey("total_fee")) {
                        Number feeObj = (Number) detail.get("total_fee");
                        BigDecimal fee = new BigDecimal(feeObj.toString());
                        if (returnOrder.getReturnShippingFee() == null || returnOrder.getReturnShippingFee().compareTo(fee) != 0) {
                            returnOrder.setReturnShippingFee(fee);
                            changed = true;
                        }
                    }
                    if (changed) {
                        returnOrderRepository.save(returnOrder);
                    }
                }
            } catch (Exception exception) {
                log.warn("Failed to synchronize GHN return {}", returnOrder.getId(), exception);
            }
        }
    }

    private ReturnOrder.ReturnStatus mapGhnStatus(String ghnStatus) {
        return switch(ghnStatus) {
            case "ready_to_pick", "picking", "picked", "storing", "sorting", "transporting", "delivering" ->
                ReturnOrder.ReturnStatus.DELIVERING;
            case "delivered", "deliveried" ->
                ReturnOrder.ReturnStatus.DELIVERED;
            default ->
                null;
        };
    }

    private boolean isForwardShippingStatus(ReturnOrder.ReturnStatus currentStatus, ReturnOrder.ReturnStatus newStatus) {
        return shippingRank(newStatus) > shippingRank(currentStatus);
    }

    private int shippingRank(ReturnOrder.ReturnStatus status) {
        return switch(status) {
            case DELIVERING ->
                1;
            case DELIVERED ->
                2;
            default ->
                Integer.MAX_VALUE;
        };
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private record ReturnCalculation(List<ReturnOrder.ReturnItem> items, BigDecimal totalRefund) {
    }
}
