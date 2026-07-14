package mss.orderservice.service;

import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.VnpayConfig;
import mss.orderservice.config.MomoEncoderUtils;
import mss.orderservice.utils.VnpayUtils;
import mss.orderservice.dto.MomoPaymentRequest;
import mss.orderservice.dto.MomoPaymentResponse;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.dto.OrderResponse;
import mss.orderservice.dto.ProductInventoryApiResponse;
import mss.orderservice.dto.ProductInventoryItemRequest;
import mss.orderservice.dto.ProductInventoryItemResponse;
import mss.orderservice.dto.ProductInventoryRequest;
import mss.orderservice.dto.ProductInventoryResponse;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final MomoConfig momoConfig;
    private final VnpayConfig vnpayConfig;
    private final GhnService ghnService;
    private final RestTemplate restTemplate;
    private final String productServiceBaseUrl;
    private final String internalServiceToken;

    public OrderService(OrderRepository orderRepository,
                        MomoConfig momoConfig,
                        VnpayConfig vnpayConfig,
                        GhnService ghnService,
                        RestTemplate restTemplate,
                        @Value("${product-service.base-url}") String productServiceBaseUrl,
                        @Value("${product-service.internal-token}") String internalServiceToken) {
        this.orderRepository = orderRepository;
        this.momoConfig = momoConfig;
        this.vnpayConfig = vnpayConfig;
        this.ghnService = ghnService;
        this.restTemplate = restTemplate;
        this.productServiceBaseUrl = productServiceBaseUrl;
        this.internalServiceToken = internalServiceToken;
    }

    public OrderResponse createOrder(OrderRequest request, String idempotencyKey) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng phải có ít nhất một sản phẩm");
        }

        Order existingOrder = orderRepository
                .findByCustomerIdAndIdempotencyKey(request.getCustomerId(), idempotencyKey)
                .orElse(null);
        if (existingOrder != null) {
            return toOrderResponse(existingOrder);
        }

        BigDecimal shippingFee = resolveShippingFee(request);

        // 1. Generate Order Code before reserving inventory, so stock logs can reference the order.
        String orderCode = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 2. Reserve inventory and resolve trusted product/variant prices from product-service.
        ProductInventoryResponse inventory = callInventoryService("reserve", toInventoryRequest(orderCode, request));
        List<OrderItem> items = inventory.getItems().stream().map(this::toOrderItem).collect(Collectors.toList());
        BigDecimal totalAmount = inventory.getTotalAmount() != null ? inventory.getTotalAmount() : BigDecimal.ZERO;
        
        totalAmount = totalAmount.add(shippingFee);

        // 3. Save Order
        Order order = Order.builder()
                .orderCode(orderCode)
                .idempotencyKey(idempotencyKey)
                .customerId(request.getCustomerId())
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .shippingAddress(request.getShippingAddress())
                .customerNote(request.getCustomerNote())
                .ghnDistrictId(request.getGhnDistrictId())
                .ghnWardCode(request.getGhnWardCode())
                .shippingFee(shippingFee)
                .items(items)
                .totalAmount(totalAmount)
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .inventoryReserved(true)
                .inventoryCommitted(false)
                .reservationExpiresAt(request.getPaymentMethod() == Order.PaymentMethod.COD ? null : LocalDateTime.now().plusMinutes(15))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        order.addStatusHistory(Order.OrderStatus.PENDING, "Khách hàng đặt đơn thành công");
        try {
            orderRepository.save(order);
        } catch (RuntimeException saveFailure) {
            compensateFailedOrderCreation(orderCode, request, saveFailure);
            throw saveFailure;
        }

        // 4. Handle Payment Method
        String paymentUrl = "";
        if (request.getPaymentMethod() == Order.PaymentMethod.MOMO) {
            paymentUrl = generateMomoPaymentUrl(order);
        } else if (request.getPaymentMethod() == Order.PaymentMethod.VNPAY) {
            paymentUrl = generateVnpayPaymentUrl(order);
        }

        return OrderResponse.builder()
                .orderCode(orderCode)
                .status(order.getStatus().name())
                .paymentUrl(paymentUrl)
                .build();
    }

    private BigDecimal resolveShippingFee(OrderRequest request) {
        Map<String, Object> feeResult = ghnService.calculateFee(
                request.getGhnDistrictId(),
                request.getGhnWardCode(),
                500,
                2);
        Object rawTotal = feeResult.get("total");
        if (!(rawTotal instanceof Number number) || number.longValue() < 0) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không tính được phí giao hàng");
        }
        return BigDecimal.valueOf(number.longValue());
    }

    private OrderResponse toOrderResponse(Order order) {
        String paymentUrl = "";
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            if (order.getPaymentMethod() == Order.PaymentMethod.MOMO) {
                paymentUrl = generateMomoPaymentUrl(order);
            } else if (order.getPaymentMethod() == Order.PaymentMethod.VNPAY) {
                paymentUrl = generateVnpayPaymentUrl(order);
            }
        }
        return OrderResponse.builder()
                .orderCode(order.getOrderCode())
                .status(order.getStatus().name())
                .paymentUrl(paymentUrl)
                .build();
    }

    private ProductInventoryRequest toInventoryRequest(String orderCode, OrderRequest request) {
        return ProductInventoryRequest.builder()
                .orderCode(orderCode)
                .items(request.getItems().stream()
                        .map(item -> ProductInventoryItemRequest.builder()
                                .productId(item.getProductId())
                                .variantId(item.getVariantId())
                                .quantity(item.getQuantity())
                                .build())
                        .toList())
                .build();
    }

    private void compensateFailedOrderCreation(String orderCode, OrderRequest request, RuntimeException saveFailure) {
        try {
            callInventoryService("release", toInventoryRequest(orderCode, request));
            log.info("Released inventory after order {} could not be persisted", orderCode);
        } catch (RuntimeException releaseFailure) {
            saveFailure.addSuppressed(releaseFailure);
            log.error("Failed to release inventory after order {} could not be persisted", orderCode, releaseFailure);
        }
    }

    private ProductInventoryRequest toInventoryRequest(Order order) {
        return ProductInventoryRequest.builder()
                .orderCode(order.getOrderCode())
                .items(order.getItems().stream()
                        .map(item -> ProductInventoryItemRequest.builder()
                                .productId(item.getProductId())
                                .variantId(item.getVariantId())
                                .quantity(item.getQuantity())
                                .build())
                        .toList())
                .build();
    }

    private OrderItem toOrderItem(ProductInventoryItemResponse item) {
        return OrderItem.builder()
                .productId(item.getProductId())
                .variantId(item.getVariantId())
                .sku(item.getSku())
                .variantName(item.getVariantName())
                .productName(item.getProductName())
                .imageUrl(item.getImageUrl())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .unitPrice(item.getUnitPrice())
                .subTotal(item.getSubTotal())
                .build();
    }

    private ProductInventoryResponse callInventoryService(String action, ProductInventoryRequest request) {
        String url = productServiceBaseUrl + "/api/products/inventory/internal/" + action;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Service-Token", internalServiceToken);
        HttpEntity<ProductInventoryRequest> entity = new HttpEntity<>(request, headers);

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                ProductInventoryApiResponse response = restTemplate.postForObject(
                        url,
                        entity,
                        ProductInventoryApiResponse.class);
                if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
                    String message = response != null && response.getMessage() != null
                            ? response.getMessage()
                            : "Inventory service did not return a valid response";
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
                }
                return response.getData();
            } catch (ResponseStatusException e) {
                throw e;
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                if (e.getStatusCode().value() == HttpStatus.CONFLICT.value() && attempt == 1) {
                    log.warn("Retrying inventory action {} for order {} after stock conflict", action, request.getOrderCode());
                    continue;
                }
                HttpStatus status = e.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()
                        ? HttpStatus.SERVICE_UNAVAILABLE
                        : HttpStatus.BAD_REQUEST;
                throw new ResponseStatusException(status, "Không thể cập nhật tồn kho: " + e.getResponseBodyAsString());
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Không kết nối được product-service để xử lý tồn kho: " + e.getMessage());
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Tồn kho vừa thay đổi, vui lòng thử lại");
    }

    private void releaseInventoryIfNeeded(Order order) {
        if (Boolean.TRUE.equals(order.getInventoryReserved()) && !Boolean.TRUE.equals(order.getInventoryCommitted())) {
            callInventoryService("release", toInventoryRequest(order));
            order.setInventoryReserved(false);
        }
    }

    private void commitInventoryIfNeeded(Order order) {
        if (Boolean.TRUE.equals(order.getInventoryReserved()) && !Boolean.TRUE.equals(order.getInventoryCommitted())) {
            callInventoryService("commit", toInventoryRequest(order));
            order.setInventoryReserved(false);
            order.setInventoryCommitted(true);
        }
    }

    private String generateMomoPaymentUrl(Order order) {
        String requestId = String.valueOf(System.currentTimeMillis());
        String orderId = order.getOrderCode();
        long amount = order.getTotalAmount().longValue();
        String orderInfo = "Thanh toan don hang " + orderId;
        String redirectUrl = momoConfig.getReturnUrl();
        String ipnUrl = momoConfig.getNotifyUrl();
        String requestType = "captureWallet";
        String extraData = "";

        // Raw signature data
        String rawData = "accessKey=" + momoConfig.getAccessKey() +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&ipnUrl=" + ipnUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + momoConfig.getPartnerCode() +
                "&redirectUrl=" + redirectUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        String signature = MomoEncoderUtils.signHmacSHA256(rawData, momoConfig.getSecretKey());

        MomoPaymentRequest momoRequest = MomoPaymentRequest.builder()
                .partnerCode(momoConfig.getPartnerCode())
                .requestId(requestId)
                .amount(amount)
                .orderId(orderId)
                .orderInfo(orderInfo)
                .redirectUrl(redirectUrl)
                .ipnUrl(ipnUrl)
                .requestType(requestType)
                .extraData(extraData)
                .lang("vi")
                .signature(signature)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<MomoPaymentRequest> entity = new HttpEntity<>(momoRequest, headers);

        try {
            MomoPaymentResponse response = restTemplate.postForObject(
                    momoConfig.getEndpoint(),
                    entity,
                    MomoPaymentResponse.class
            );

            if (response != null && response.getPayUrl() != null) {
                return response.getPayUrl();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return "";
    }

    private String generateVnpayPaymentUrl(Order order) {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String orderType = "other";
        long amount = order.getTotalAmount().longValue() * 100;

        String vnp_TxnRef = order.getOrderCode();
        
        String vnp_IpAddr = "113.168.1.1"; // Default public IP
        try {
            org.springframework.web.context.request.ServletRequestAttributes attrs = 
                (org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                jakarta.servlet.http.HttpServletRequest req = attrs.getRequest();
                vnp_IpAddr = req.getHeader("X-FORWARDED-FOR");
                if (vnp_IpAddr == null || vnp_IpAddr.isEmpty()) {
                    vnp_IpAddr = req.getRemoteAddr();
                }
                if (vnp_IpAddr != null && vnp_IpAddr.contains(",")) {
                    vnp_IpAddr = vnp_IpAddr.split(",")[0].trim();
                }
                if ("0:0:0:0:0:0:0:1".equals(vnp_IpAddr) || "127.0.0.1".equals(vnp_IpAddr)) {
                    vnp_IpAddr = "113.168.1.1"; // Mock public IP to satisfy VNPay firewall if local
                }
            }
        } catch (Exception ignored) {}

        String secretKey = vnpayConfig.getHashSecret().replace("\"", "").replace("'", "").trim();
        String tmnCode = vnpayConfig.getTmnCode().replace("\"", "").replace("'", "").trim();
        String returnUrl = vnpayConfig.getReturnUrl().replace("\"", "").replace("'", "").trim();
        String baseUrl = vnpayConfig.getUrl().replace("\"", "").replace("'", "").trim();

        java.util.Map<String, String> vnp_Params = new java.util.HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", tmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", "ThanhToanDonHang_" + vnp_TxnRef);
        vnp_Params.put("vnp_OrderType", orderType);
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", returnUrl);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        java.util.Calendar cld = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);
        
        cld.add(java.util.Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        java.util.List<String> fieldNames = new java.util.ArrayList<>(vnp_Params.keySet());
        java.util.Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        java.util.Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = (String) itr.next();
            String fieldValue = (String) vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                try {
                    String encodedValue = java.net.URLEncoder.encode(fieldValue, java.nio.charset.StandardCharsets.US_ASCII.toString());
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(encodedValue);
                    query.append(java.net.URLEncoder.encode(fieldName, java.nio.charset.StandardCharsets.US_ASCII.toString()));
                    query.append('=');
                    query.append(encodedValue);
                } catch (java.io.UnsupportedEncodingException e) {
                    e.printStackTrace();
                }
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }
        String queryUrl = query.toString();
        String vnp_SecureHash = VnpayUtils.hmacSHA512(secretKey, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        String paymentUrl = baseUrl + "?" + queryUrl;
        
        System.out.println(">>> VNPAY PAYMENT URL GENERATED: " + paymentUrl);
        return paymentUrl;
    }
    
    public OrderResponse cancelOrder(String orderId, String cancelReason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with id: " + orderId));
        
        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể hủy đơn hàng đang chờ duyệt");
        }
        
        if (cancelReason == null || cancelReason.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng cung cấp lý do hủy đơn");
        }
        
        order.addStatusHistory(Order.OrderStatus.CANCELLED, "Hủy đơn: " + cancelReason);
        order.setCancelReason(cancelReason);
        
        if (order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
        }
        releaseInventoryIfNeeded(order);
        
        orderRepository.save(order);
        
        return OrderResponse.builder()
                .orderCode(order.getOrderCode())
                .status(order.getStatus().name())
                .build();
    }

    public void processMomoIpn(String orderId, Integer resultCode, long amount) {
        orderRepository.findByOrderCode(orderId).ifPresent(order -> {
            validatePaymentAmount(order, BigDecimal.valueOf(amount));
            if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
                return;
            }
            if (resultCode == 0) {
                rejectLatePayment(order);
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                order.addStatusHistory(Order.OrderStatus.PROCESSING, "Thanh toán thành công qua Momo"); // Move to next step
            } else {
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
                order.addStatusHistory(Order.OrderStatus.CANCELLED, "Thanh toán MoMo thất bại");
                releaseInventoryIfNeeded(order);
            }
            orderRepository.save(order);
        });
    }

    public void processVnpayIpn(String orderId, String responseCode, long amountTimes100) {
        Order order = orderRepository.findByOrderCode(orderId).orElse(null);
        if (order == null) return;
        validatePaymentAmount(order, BigDecimal.valueOf(amountTimes100, 2));
        
        if ("00".equals(responseCode)) {
            if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
                rejectLatePayment(order);
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                order.setStatus(Order.OrderStatus.PROCESSING); // Đã thanh toán, chờ xử lý GHN
                order.setUpdatedAt(LocalDateTime.now());
                orderRepository.save(order);
            }
        } else if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
            order.addStatusHistory(Order.OrderStatus.CANCELLED, "Thanh toán VNPay thất bại");
            releaseInventoryIfNeeded(order);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);
        }
    }

    private void validatePaymentAmount(Order order, BigDecimal paidAmount) {
        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(paidAmount) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số tiền thanh toán không khớp đơn hàng");
        }
    }

    private void rejectLatePayment(Order order) {
        if (order.getStatus() == Order.OrderStatus.CANCELLED || !Boolean.TRUE.equals(order.getInventoryReserved())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn hàng đã hết hạn hoặc đã hủy");
        }
    }

    public Order getOrderById(String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public String getPaymentUrlForOrder(String orderId) {
        Order order = getOrderById(orderId);
        if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng đã được thanh toán");
        }
        if (order.getPaymentMethod() == Order.PaymentMethod.MOMO) {
            return generateMomoPaymentUrl(order);
        } else if (order.getPaymentMethod() == Order.PaymentMethod.VNPAY) {
            return generateVnpayPaymentUrl(order);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phương thức thanh toán không hỗ trợ thanh toán trực tuyến");
    }

    public Page<Order> getOrdersByCustomerId(String customerId, int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                String[] statusArray = status.split(",");
                List<Order.OrderStatus> statuses = java.util.Arrays.stream(statusArray)
                        .map(s -> Order.OrderStatus.valueOf(s.trim().toUpperCase()))
                        .collect(java.util.stream.Collectors.toList());
                        
                if (statuses.size() == 1) {
                    return orderRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, statuses.get(0), pageable);
                } else if (statuses.size() > 1) {
                    return orderRepository.findByCustomerIdAndStatusInOrderByCreatedAtDesc(customerId, statuses, pageable);
                }
            } catch (IllegalArgumentException e) {
                // Ignore invalid status and return all
            }
        }
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }
    public Page<Order> getAllOrders(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                String[] statusArray = status.split(",");
                List<Order.OrderStatus> statuses = java.util.Arrays.stream(statusArray)
                        .map(s -> Order.OrderStatus.valueOf(s.trim().toUpperCase()))
                        .collect(java.util.stream.Collectors.toList());
                        
                if (statuses.size() == 1) {
                    return orderRepository.findByStatusOrderByCreatedAtDesc(statuses.get(0), pageable);
                } else if (statuses.size() > 1) {
                    return orderRepository.findByStatusInOrderByCreatedAtDesc(statuses, pageable);
                }
            } catch (IllegalArgumentException e) {
                // Ignore invalid status and return all
            }
        }
        return orderRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Order updateOrderStatus(String orderId, String newStatus, String cancelReason, Integer weight, Integer length, Integer width, Integer height, String requiredNote) {
        return orderRepository.findById(orderId).map(order -> {
            try {
                Order.OrderStatus status = Order.OrderStatus.valueOf(newStatus.toUpperCase());
                
                // Block changing from cancelled/refused
                if ((order.getStatus() == Order.OrderStatus.CANCELLED || order.getStatus() == Order.OrderStatus.REFUSED) 
                    && (status != Order.OrderStatus.CANCELLED && status != Order.OrderStatus.REFUSED)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancelled/Refused orders cannot be changed");
                }

                // Rule for PENDING orders
                if (order.getStatus() == Order.OrderStatus.PENDING) {
                    if (status != Order.OrderStatus.PROCESSING && status != Order.OrderStatus.CANCELLED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn đang chờ duyệt chỉ có thể Hủy hoặc chuyển sang Đang chuẩn bị");
                    }
                    if (status == Order.OrderStatus.PROCESSING) {
                        if (order.getPaymentMethod() != Order.PaymentMethod.COD && order.getPaymentStatus() != Order.PaymentStatus.PAID) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể duyệt đơn hàng thanh toán trực tuyến khi khách chưa chuyển khoản thành công");
                        }
                    }
                    if (status == Order.OrderStatus.CANCELLED) {
                        if (cancelReason == null || cancelReason.trim().isEmpty()) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần cung cấp lý do hủy đơn");
                        }
                        order.setCancelReason(cancelReason);
                        releaseInventoryIfNeeded(order);
                    }
                }

                // Rule for PROCESSING orders
                if (order.getStatus() == Order.OrderStatus.PROCESSING) {
                    if (status != Order.OrderStatus.READY_TO_PICK) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn đang chuẩn bị chỉ có thể chuyển sang Chờ lấy hàng");
                    }
                    if (weight == null || weight <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập khối lượng kiện hàng (gram)");
                    }
                }
                
                // GHN Integration
                if (status == Order.OrderStatus.READY_TO_PICK && order.getStatus() == Order.OrderStatus.PROCESSING) {
                    if (order.getGhnWardCode() == null || order.getGhnDistrictId() == null) {
                         throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không có mã địa chỉ GHN. Không thể tạo đơn.");
                    }
                    
                    java.util.Map<String, Object> ghnData = new java.util.HashMap<>();
                    ghnData.put("payment_type_id", order.getPaymentMethod() == Order.PaymentMethod.COD ? 2 : 1);
                    ghnData.put("required_note", requiredNote != null ? requiredNote : "CHOXEMHANGKHONGTHU");
                    if (order.getCustomerNote() != null && !order.getCustomerNote().isBlank()) {
                        ghnData.put("note", order.getCustomerNote());
                    }
                    ghnData.put("client_order_code", order.getOrderCode());
                    ghnData.put("to_name", order.getCustomerName());
                    ghnData.put("to_phone", order.getCustomerPhone());
                    ghnData.put("to_address", order.getShippingAddress());
                    ghnData.put("to_ward_code", order.getGhnWardCode());
                    ghnData.put("to_district_id", order.getGhnDistrictId());
                    ghnData.put("weight", weight);
                    ghnData.put("length", length != null ? length : 15);
                    ghnData.put("width", width != null ? width : 15);
                    ghnData.put("height", height != null ? height : 10);
                    ghnData.put("service_type_id", 2); // Đi bộ / Chuẩn
                    
                    int totalAmount = order.getTotalAmount() != null ? order.getTotalAmount().intValue() : 0;
                    int shippingFee = order.getShippingFee() != null ? order.getShippingFee().intValue() : 0;
                    int insuranceValue = totalAmount - shippingFee;
                    ghnData.put("insurance_value", insuranceValue > 0 ? insuranceValue : 0);
                    
                    if (order.getPaymentMethod() == Order.PaymentMethod.COD) {
                        ghnData.put("cod_amount", totalAmount);
                    } else {
                        ghnData.put("cod_amount", 0);
                    }
                    
                    int itemWeight = weight / (order.getItems().size() > 0 ? order.getItems().size() : 1);
                    java.util.List<java.util.Map<String, Object>> ghnItems = order.getItems().stream().map(item -> {
                        java.util.Map<String, Object> map = new java.util.HashMap<>();
                        map.put("name", item.getProductName());
                        map.put("code", item.getProductId()); // Mã sản phẩm
                        map.put("quantity", item.getQuantity());
                        map.put("price", item.getUnitPrice().intValue());
                        map.put("weight", itemWeight > 0 ? itemWeight : 50); // Cân nặng chia đều theo tổng
                        return map;
                    }).collect(java.util.stream.Collectors.toList());
                    
                    ghnData.put("items", ghnItems);
                    
                    try {
                        String trackingCode = ghnService.createOrder(ghnData);
                        order.setTrackingCode(trackingCode);
                    } catch (Exception e) {
                        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể kết nối GHN: " + e.getMessage());
                    }
                }
                
                String note = "Admin cập nhật trạng thái";
                if (status == Order.OrderStatus.CANCELLED && cancelReason != null && !cancelReason.trim().isEmpty()) {
                    note = "Hủy đơn: " + cancelReason;
                }
                order.addStatusHistory(status, note);
                
                // Update payment status for CANCELLED/REFUSED
                if ((status == Order.OrderStatus.CANCELLED || status == Order.OrderStatus.REFUSED) 
                    && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                    order.setPaymentStatus(Order.PaymentStatus.FAILED);
                }
                if (status == Order.OrderStatus.CANCELLED || status == Order.OrderStatus.REFUSED) {
                    releaseInventoryIfNeeded(order);
                }
                
                // Update payment status for DELIVERED COD
                if (status == Order.OrderStatus.DELIVERED && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                    order.setPaymentStatus(Order.PaymentStatus.PAID);
                }
                if (status == Order.OrderStatus.DELIVERED) {
                    commitInventoryIfNeeded(order);
                }

                return orderRepository.save(order);
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid order status: " + newStatus);
            }
        }).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with id: " + orderId));
    }

    @Scheduled(fixedRate = 60000) // Chạy mỗi 1 phút
    public void autoCancelUnpaidOrders() {
        LocalDateTime threshold = LocalDateTime.now();
        List<Order> expiredOrders = orderRepository.findExpiredUnpaidOrders(threshold);
        for (Order order : expiredOrders) {
            order.addStatusHistory(Order.OrderStatus.CANCELLED, "Hủy tự động do quá hạn thanh toán 15 phút");
            order.setCancelReason("Hủy tự động do quá hạn thanh toán 15 phút");
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
            releaseInventoryIfNeeded(order);
            orderRepository.save(order);
            log.info("Auto-cancelled unpaid order: {}", order.getOrderCode());
        }
    }

    @Scheduled(fixedRate = 300000) // Chạy mỗi 5 phút
    public void syncGhnOrderStatus() {
        List<Order> activeOrders = orderRepository.findActiveGhnOrders();
        for (Order order : activeOrders) {
            try {
                Map<String, Object> detail = ghnService.getOrderDetail(order.getTrackingCode());
                if (detail != null && detail.containsKey("status")) {
                    String ghnStatus = (String) detail.get("status");
                    Order.OrderStatus newStatus = mapGhnStatusToSystemStatus(ghnStatus);
                    if (newStatus != null && newStatus != order.getStatus()) {
                        applyShippingStatus(order, newStatus, "Hệ thống tự động cập nhật từ GHN");
                        log.info("Auto-synced GHN order {}: {} -> {}", order.getOrderCode(), ghnStatus, newStatus);
                    }
                }
            } catch (Exception e) {
                log.error("Error syncing GHN order {}: {}", order.getOrderCode(), e.getMessage());
            }
        }
    }

    public Order.OrderStatus mapGhnStatusToSystemStatus(String ghnStatus) {
        switch (ghnStatus) {
            case "ready_to_pick":
                return Order.OrderStatus.READY_TO_PICK;
            case "picking":
                return Order.OrderStatus.PICKING;
            case "picked":
                return Order.OrderStatus.PICKED;
            case "storing":
                return Order.OrderStatus.STORING;
            case "sorting":
                return Order.OrderStatus.SORTING;
            case "transporting":
                return Order.OrderStatus.TRANSPORTING;
            case "delivering":
                return Order.OrderStatus.DELIVERING;
            case "delivered":
            case "deliveried":
                return Order.OrderStatus.DELIVERED;
            case "delivery_fail":
                return Order.OrderStatus.DELIVERY_FAIL;
            case "waiting_to_return":
                return Order.OrderStatus.WAITING_TO_RETURN;
            case "return":
                return Order.OrderStatus.RETURN;
            case "return_transporting":
                return Order.OrderStatus.RETURN_TRANSPORTING;
            case "returning":
                return Order.OrderStatus.RETURNING;
            case "return_fail":
                return Order.OrderStatus.RETURN_FAIL;
            case "returned":
                return Order.OrderStatus.RETURNED;
            case "cancel":
                return Order.OrderStatus.CANCELLED;
            default:
                return null;
        }
    }

    public Order applyShippingStatus(Order order, Order.OrderStatus newStatus, String note) {
        if (order.getStatus() == newStatus) {
            return order;
        }
        order.addStatusHistory(newStatus, note);
        if (newStatus == Order.OrderStatus.CANCELLED || newStatus == Order.OrderStatus.REFUSED) {
            if (order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
            }
            releaseInventoryIfNeeded(order);
        }
        if (newStatus == Order.OrderStatus.DELIVERED) {
            if (order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                order.setPaymentStatus(Order.PaymentStatus.PAID);
            }
            commitInventoryIfNeeded(order);
        }
        return orderRepository.save(order);
    }
}
