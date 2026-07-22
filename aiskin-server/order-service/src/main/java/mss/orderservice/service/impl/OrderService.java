// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service.impl;

import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.VnpayConfig;
import mss.orderservice.config.MomoEncoderUtils;
import mss.orderservice.utils.VnpayUtils;
import mss.orderservice.dto.MomoPaymentRequest;
import mss.orderservice.dto.MomoPaymentResponse;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.dto.OrderResponse;
import mss.orderservice.dto.PaymentProcessingResult;
import mss.orderservice.dto.ProductInventoryApiResponse;
import mss.orderservice.dto.ProductInventoryItemRequest;
import mss.orderservice.dto.ProductInventoryItemResponse;
import mss.orderservice.dto.ProductInventoryRequest;
import mss.orderservice.dto.ProductInventoryResponse;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.service.IVoucherService;
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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.service.*;

@Slf4j
@Service
public class OrderService implements IOrderService {

    private static final ZoneId VIETNAM_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private static final int MAX_PAGE_SIZE = 100;

    private final OrderRepository orderRepository;

    private final MomoConfig momoConfig;

    private final VnpayConfig vnpayConfig;

    private final IGhnService ghnService;

    private final PaymentConfigurationValidator paymentConfigurationValidator;

    private final IVoucherService voucherService;

    private final RestTemplate restTemplate;

    private final String productServiceBaseUrl;

    private final String internalServiceToken;

    private final boolean bankTransferSimulationEnabled;

    public OrderService(OrderRepository orderRepository, MomoConfig momoConfig, VnpayConfig vnpayConfig, IGhnService ghnService, PaymentConfigurationValidator paymentConfigurationValidator, IVoucherService voucherService, RestTemplate restTemplate, @Value("${product-service.base-url}") String productServiceBaseUrl, @Value("${product-service.internal-token}") String internalServiceToken, @Value("${app.features.bank-transfer-simulation-enabled:false}") boolean bankTransferSimulationEnabled) {
        this.orderRepository = orderRepository;
        this.momoConfig = momoConfig;
        this.vnpayConfig = vnpayConfig;
        this.ghnService = ghnService;
        this.paymentConfigurationValidator = paymentConfigurationValidator;
        this.voucherService = voucherService;
        this.restTemplate = restTemplate;
        this.productServiceBaseUrl = productServiceBaseUrl;
        this.internalServiceToken = internalServiceToken;
        this.bankTransferSimulationEnabled = bankTransferSimulationEnabled;
    }

    public OrderResponse createOrder(OrderRequest request, String idempotencyKey) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng phải có ít nhất một sản phẩm");
        }
        requirePaymentMethodConfigured(request.getPaymentMethod());
        Order existingOrder = orderRepository.findByCustomerIdAndIdempotencyKey(request.getCustomerId(), idempotencyKey).orElse(null);
        if (existingOrder != null) {
            return toOrderResponse(existingOrder);
        }
        BigDecimal shippingFee = resolveShippingFee(request);
        // 1. Generate Order Code before reserving inventory, so stock logs can reference the order.
        String orderCode = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        // 2. Reserve inventory and resolve trusted product/variant prices from product-service.
        ProductInventoryResponse inventory = callInventoryService("reserve", toInventoryRequest(orderCode, request));
        List<OrderItem> items = inventory.getItems().stream().map(this::toOrderItem).collect(Collectors.toList());
        BigDecimal subtotal = inventory.getTotalAmount() != null ? inventory.getTotalAmount() : BigDecimal.ZERO;
        // 2b. Voucher (nếu có) áp trên subtotal hàng — KHÔNG tính phí ship — vì phí ship là chi phí
        // vận chuyển thực tế trả cho GHN, không phải giá trị đơn hàng khách mua. Phải trừ vào
        // totalAmount TRƯỚC khi save vì validatePaymentAmount() so khớp tuyệt đối với paidAmount.
        String voucherCode = normalizeVoucherCode(request.getVoucherCode());
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (voucherCode != null) {
            try {
                discountAmount = voucherService.validateAndCalculateDiscount(voucherCode, subtotal);
                // Claim atomically before persisting the discounted order so concurrent requests
                // cannot exceed the voucher usage limit.
                voucherService.incrementUsage(voucherCode);
            } catch (RuntimeException voucherFailure) {
                // Tồn kho đã được reserve ở bước 2 nên phải release lại nếu voucher không hợp lệ.
                compensateFailedOrderCreation(orderCode, request, voucherFailure);
                throw voucherFailure;
            }
        }
        BigDecimal totalAmount = subtotal.add(shippingFee).subtract(discountAmount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }
        // 3. Save Order
        Order order = Order.builder().orderCode(orderCode).idempotencyKey(idempotencyKey).customerId(request.getCustomerId()).customerName(request.getCustomerName()).customerPhone(request.getCustomerPhone()).shippingAddress(request.getShippingAddress()).customerNote(request.getCustomerNote()).ghnDistrictId(request.getGhnDistrictId()).ghnWardCode(request.getGhnWardCode()).shippingFee(shippingFee).items(items).totalAmount(totalAmount).voucherCode(voucherCode).discountAmount(discountAmount).status(Order.OrderStatus.PENDING).paymentMethod(request.getPaymentMethod()).paymentStatus(Order.PaymentStatus.UNPAID).inventoryReserved(true).inventoryCommitted(false).reservationExpiresAt(request.getPaymentMethod() == Order.PaymentMethod.COD ? null : LocalDateTime.now().plusMinutes(15)).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        order.addStatusHistory(Order.OrderStatus.PENDING, "Khách hàng đặt đơn thành công");
        try {
            orderRepository.save(order);
        } catch (RuntimeException saveFailure) {
            if (voucherCode != null) {
                try {
                    voucherService.releaseUsage(voucherCode);
                } catch (RuntimeException releaseFailure) {
                    saveFailure.addSuppressed(releaseFailure);
                    log.error("Failed to release voucher usage {} after order {} could not be persisted",
                            voucherCode, orderCode, releaseFailure);
                }
            }
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
        return OrderResponse.builder().orderCode(orderCode).status(order.getStatus().name()).paymentUrl(paymentUrl).build();
    }

    private void requirePaymentMethodConfigured(Order.PaymentMethod paymentMethod) {
        if (paymentMethod == Order.PaymentMethod.MOMO) {
            paymentConfigurationValidator.requireMomoConfigured();
        } else if (paymentMethod == Order.PaymentMethod.VNPAY) {
            paymentConfigurationValidator.requireVnpayConfigured();
        }
    }

    private BigDecimal resolveShippingFee(OrderRequest request) {
        Map<String, Object> feeResult = ghnService.calculateFee(request.getGhnDistrictId(), request.getGhnWardCode(), 500, 2);
        Object rawTotal = feeResult.get("total");
        if (!(rawTotal instanceof Number number) || number.longValue() < 0) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không tính được phí giao hàng");
        }
        return BigDecimal.valueOf(number.longValue());
    }

    private String normalizeVoucherCode(String voucherCode) {
        if (voucherCode == null || voucherCode.isBlank()) {
            return null;
        }
        return voucherCode.trim().toUpperCase();
    }

    private OrderResponse toOrderResponse(Order order) {
        String paymentUrl = "";
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            if (order.getPaymentMethod() == Order.PaymentMethod.MOMO) {
                paymentUrl = generateMomoPaymentUrl(order);
            } else if (order.getPaymentMethod() == Order.PaymentMethod.VNPAY) {
                paymentUrl = generateVnpayPaymentUrl(order);
            } else if (order.getPaymentMethod() == Order.PaymentMethod.BANK_TRANSFER) {
                // Frontend tự xử lý hiển thị QR
                paymentUrl = "";
            }
        }
        return OrderResponse.builder().orderCode(order.getOrderCode()).status(order.getStatus().name()).paymentUrl(paymentUrl).build();
    }

    private ProductInventoryRequest toInventoryRequest(String orderCode, OrderRequest request) {
        return ProductInventoryRequest.builder().orderCode(orderCode).items(request.getItems().stream().map(item -> ProductInventoryItemRequest.builder().productId(item.getProductId()).variantId(item.getVariantId()).quantity(item.getQuantity()).build()).toList()).build();
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
        return ProductInventoryRequest.builder().orderCode(order.getOrderCode()).items(order.getItems().stream().map(item -> ProductInventoryItemRequest.builder().productId(item.getProductId()).variantId(item.getVariantId()).quantity(item.getQuantity()).build()).toList()).build();
    }

    private OrderItem toOrderItem(ProductInventoryItemResponse item) {
        return OrderItem.builder().productId(item.getProductId()).variantId(item.getVariantId()).sku(item.getSku()).variantName(item.getVariantName()).productName(item.getProductName()).imageUrl(item.getImageUrl()).quantity(item.getQuantity()).unit(item.getUnit()).unitPrice(item.getUnitPrice()).subTotal(item.getSubTotal()).build();
    }

    private ProductInventoryResponse callInventoryService(String action, ProductInventoryRequest request) {
        String url = productServiceBaseUrl + "/api/products/inventory/internal/" + action;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Service-Token", internalServiceToken);
        HttpEntity<ProductInventoryRequest> entity = new HttpEntity<>(request, headers);
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                ProductInventoryApiResponse response = restTemplate.postForObject(url, entity, ProductInventoryApiResponse.class);
                if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
                    String message = response != null && response.getMessage() != null ? response.getMessage() : "Inventory service did not return a valid response";
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
                HttpStatus status = e.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value() ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_REQUEST;
                log.warn("Inventory action {} failed with HTTP {} for order {}", action, e.getStatusCode().value(), request.getOrderCode());
                String message = status == HttpStatus.SERVICE_UNAVAILABLE ? "Tạm thời không thể xử lý tồn kho" : "Sản phẩm hoặc số lượng tồn kho không hợp lệ";
                throw new ResponseStatusException(status, message);
            } catch (Exception e) {
                log.error("Inventory action {} could not reach product-service for order {}", action, request.getOrderCode(), e);
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Tạm thời không thể xử lý tồn kho");
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

    // Hoàn lại lượt dùng voucher khi đơn hàng có áp voucher bị hủy/trả hàng, đối xứng với
    // releaseInventoryIfNeeded. Dùng cờ voucherUsageReleased để không bị trừ hai lần khi hàm này được
    // gọi lại nhiều nơi cho cùng một lần chuyển trạng thái (giống cách inventoryReserved bảo vệ release).
    // Lỗi ở bước này chỉ được log lại chứ không chặn việc hủy/trả đơn — chấp nhận rủi ro nhỏ cho phạm vi đồ án.
    private void releaseVoucherIfNeeded(Order order) {
        String voucherCode = order.getVoucherCode();
        if (voucherCode == null || voucherCode.isBlank() || Boolean.TRUE.equals(order.getVoucherUsageReleased())) {
            return;
        }
        try {
            voucherService.releaseUsage(voucherCode);
            order.setVoucherUsageReleased(true);
        } catch (RuntimeException releaseFailure) {
            log.error("Failed to release voucher usage {} for order {}", voucherCode, order.getOrderCode(), releaseFailure);
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
        paymentConfigurationValidator.requireMomoConfigured();
        String requestId = String.valueOf(System.currentTimeMillis());
        String orderId = order.getOrderCode();
        long amount = order.getTotalAmount().longValueExact();
        String orderInfo = "Thanh toan don hang " + orderId;
        String redirectUrl = momoConfig.getReturnUrl();
        String ipnUrl = momoConfig.getNotifyUrl();
        String requestType = "captureWallet";
        String extraData = "";
        // Raw signature data
        String rawData = "accessKey=" + momoConfig.getAccessKey() + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + momoConfig.getPartnerCode() + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
        String signature = MomoEncoderUtils.signHmacSHA256(rawData, momoConfig.getSecretKey());
        MomoPaymentRequest momoRequest = MomoPaymentRequest.builder().partnerCode(momoConfig.getPartnerCode()).requestId(requestId).amount(amount).orderId(orderId).orderInfo(orderInfo).redirectUrl(redirectUrl).ipnUrl(ipnUrl).requestType(requestType).extraData(extraData).lang("vi").signature(signature).build();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<MomoPaymentRequest> entity = new HttpEntity<>(momoRequest, headers);
        try {
            MomoPaymentResponse response = restTemplate.postForObject(momoConfig.getEndpoint(), entity, MomoPaymentResponse.class);
            if (response != null && Integer.valueOf(0).equals(response.getResultCode()) && response.getPayUrl() != null && !response.getPayUrl().isBlank()) {
                return response.getPayUrl();
            }
            log.warn("MoMo rejected payment initialization for order {} with resultCode {}", orderId, response == null ? null : response.getResultCode());
        } catch (Exception exception) {
            log.error("MoMo payment initialization failed for order {}", orderId, exception);
        }
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không thể khởi tạo thanh toán MoMo lúc này");
    }

    private String generateVnpayPaymentUrl(Order order) {
        paymentConfigurationValidator.requireVnpayConfigured();
        long amount = order.getTotalAmount().movePointRight(2).longValueExact();
        LocalDateTime createdAt = LocalDateTime.now(VIETNAM_TIME_ZONE);
        Map<String, String> parameters = new HashMap<>();
        parameters.put("vnp_Version", "2.1.0");
        parameters.put("vnp_Command", "pay");
        parameters.put("vnp_TmnCode", vnpayConfig.getTmnCode().trim());
        parameters.put("vnp_Amount", String.valueOf(amount));
        parameters.put("vnp_CurrCode", "VND");
        parameters.put("vnp_TxnRef", order.getOrderCode());
        parameters.put("vnp_OrderInfo", "ThanhToanDonHang_" + order.getOrderCode());
        parameters.put("vnp_OrderType", "210000");
        if (vnpayConfig.getBankCode() != null && !vnpayConfig.getBankCode().isBlank()) {
            parameters.put("vnp_BankCode", vnpayConfig.getBankCode().trim());
        }
        parameters.put("vnp_Locale", "vn");
        parameters.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl().trim());
        parameters.put("vnp_IpAddr", resolveVnpayClientIp());
        parameters.put("vnp_CreateDate", createdAt.format(VNPAY_DATE_FORMAT));
        parameters.put("vnp_ExpireDate", createdAt.plusMinutes(15).format(VNPAY_DATE_FORMAT));
        String query = VnpayUtils.canonicalize(parameters);
        String secureHash = VnpayUtils.hmacSHA512(vnpayConfig.getHashSecret().trim(), query);
        String separator = vnpayConfig.getUrl().contains("?") ? "&" : "?";
        return vnpayConfig.getUrl().trim() + separator + query + "&vnp_SecureHash=" + secureHash;
    }

    private String resolveVnpayClientIp() {
        String clientIp = "113.168.1.1";
        try {
            org.springframework.web.context.request.ServletRequestAttributes attributes = (org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                String remoteAddress = attributes.getRequest().getRemoteAddr();
                if (remoteAddress != null && !remoteAddress.isBlank()) {
                    clientIp = remoteAddress;
                }
            }
        } catch (RuntimeException exception) {
            log.debug("Cannot resolve client IP for VNPay", exception);
        }
        if ("0:0:0:0:0:0:0:1".equals(clientIp) || "127.0.0.1".equals(clientIp)) {
            return "113.168.1.1";
        }
        return clientIp;
    }

    public OrderResponse cancelOrder(String orderId, String cancelReason) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with id: " + orderId));
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
        releaseVoucherIfNeeded(order);
        orderRepository.save(order);
        return OrderResponse.builder().orderCode(order.getOrderCode()).status(order.getStatus().name()).build();
    }

    public PaymentProcessingResult processMomoIpn(String orderId, int resultCode, long amount, String transactionId) {
        Order order = findPaymentOrder(orderId, Order.PaymentMethod.MOMO);
        validatePaymentAmount(order, BigDecimal.valueOf(amount));
        if (order.getPaymentStatus() != Order.PaymentStatus.UNPAID) {
            return existingPaymentResult(order);
        }
        if (resultCode == 0) {
            rejectLatePayment(order);
            String verifiedTransactionId = requireTransactionId(transactionId);
            order.setPaymentStatus(Order.PaymentStatus.PAID);
            order.setPaymentTransactionId(verifiedTransactionId);
            order.setPaidAt(LocalDateTime.now());
            order.addStatusHistory(Order.OrderStatus.PROCESSING, "Thanh toán thành công qua MoMo");
        } else {
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
            order.addStatusHistory(Order.OrderStatus.CANCELLED, "Thanh toán MoMo thất bại");
            releaseInventoryIfNeeded(order);
            releaseVoucherIfNeeded(order);
        }
        orderRepository.save(order);
        return new PaymentProcessingResult(order.getPaymentStatus(), false);
    }

    public PaymentProcessingResult processVnpayIpn(String orderId, String responseCode, String transactionStatus, long amountTimes100, String transactionId) {
        Order order = findPaymentOrder(orderId, Order.PaymentMethod.VNPAY);
        validatePaymentAmount(order, BigDecimal.valueOf(amountTimes100, 2));
        if (order.getPaymentStatus() != Order.PaymentStatus.UNPAID) {
            return existingPaymentResult(order);
        }
        if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
            rejectLatePayment(order);
            String verifiedTransactionId = requireTransactionId(transactionId);
            order.setPaymentStatus(Order.PaymentStatus.PAID);
            order.setPaymentTransactionId(verifiedTransactionId);
            order.setPaidAt(LocalDateTime.now());
            order.addStatusHistory(Order.OrderStatus.PROCESSING, "Thanh toán thành công qua VNPay");
        } else {
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
            order.addStatusHistory(Order.OrderStatus.CANCELLED, "Thanh toán VNPay thất bại");
            releaseInventoryIfNeeded(order);
            releaseVoucherIfNeeded(order);
        }
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);
        return new PaymentProcessingResult(order.getPaymentStatus(), false);
    }

    public PaymentProcessingResult simulateBankTransfer(String orderCode) {
        if (!bankTransferSimulationEnabled) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bank transfer simulation is disabled");
        }
        Order order = orderRepository.findByOrderCode(orderCode).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        if (order.getPaymentMethod() != Order.PaymentMethod.BANK_TRANSFER) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn hàng không sử dụng hình thức chuyển khoản");
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.UNPAID) {
            return existingPaymentResult(order);
        }
        rejectLatePayment(order);
        order.setPaymentStatus(Order.PaymentStatus.PAID);
        order.setPaymentTransactionId("SIMULATED-" + java.util.UUID.randomUUID().toString().substring(0, 8));
        order.setPaidAt(LocalDateTime.now());
        order.addStatusHistory(Order.OrderStatus.PROCESSING, "Khách hàng đã chuyển khoản");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);
        return new PaymentProcessingResult(order.getPaymentStatus(), false);
    }

    private PaymentProcessingResult existingPaymentResult(Order order) {
        return new PaymentProcessingResult(order.getPaymentStatus(), true);
    }

    private String requireTransactionId(String transactionId) {
        if (transactionId == null || transactionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu mã giao dịch thanh toán");
        }
        return transactionId.trim();
    }

    private Order findPaymentOrder(String orderCode, Order.PaymentMethod expectedMethod) {
        Order order = orderRepository.findByOrderCode(orderCode).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn thanh toán"));
        if (order.getPaymentMethod() != expectedMethod) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Callback không đúng phương thức thanh toán của đơn");
        }
        return order;
    }

    private void validatePaymentAmount(Order order, BigDecimal paidAmount) {
        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(paidAmount) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số tiền thanh toán không khớp đơn hàng");
        }
    }

    private void rejectLatePayment(Order order) {
        boolean reservationExpired = order.getReservationExpiresAt() != null
                && !order.getReservationExpiresAt().isAfter(LocalDateTime.now());
        if (order.getStatus() == Order.OrderStatus.CANCELLED
                || !Boolean.TRUE.equals(order.getInventoryReserved())
                || reservationExpired) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn hàng đã hết hạn hoặc đã hủy");
        }
    }

    public Order getOrderById(String idOrCode) {
        if (idOrCode != null && idOrCode.startsWith("ORD-")) {
            return orderRepository.findByOrderCode(idOrCode).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        }
        return orderRepository.findById(idOrCode).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public String getPaymentUrlForOrder(String orderId) {
        Order order = getOrderById(orderId);
        if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng đã được thanh toán");
        }
        if (order.getStatus() == Order.OrderStatus.CANCELLED || !Boolean.TRUE.equals(order.getInventoryReserved())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn hàng đã hủy hoặc không còn giữ hàng");
        }
        if (order.getReservationExpiresAt() != null && order.getReservationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn hàng đã hết thời gian thanh toán 15 phút");
        }
        if (order.getPaymentMethod() == Order.PaymentMethod.MOMO) {
            return generateMomoPaymentUrl(order);
        } else if (order.getPaymentMethod() == Order.PaymentMethod.VNPAY) {
            return generateVnpayPaymentUrl(order);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phương thức thanh toán không hỗ trợ thanh toán trực tuyến");
    }

    public Page<Order> getOrdersByCustomerId(String customerId, int page, int size, String status) {
        Pageable pageable = validatedPageRequest(page, size);
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                String[] statusArray = status.split(",");
                List<Order.OrderStatus> statuses = java.util.Arrays.stream(statusArray).map(s -> Order.OrderStatus.valueOf(s.trim().toUpperCase())).collect(java.util.stream.Collectors.toList());
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
        Pageable pageable = validatedPageRequest(page, size);
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                String[] statusArray = status.split(",");
                List<Order.OrderStatus> statuses = java.util.Arrays.stream(statusArray).map(s -> Order.OrderStatus.valueOf(s.trim().toUpperCase())).collect(java.util.stream.Collectors.toList());
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

    private Pageable validatedPageRequest(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phân trang không hợp lệ");
        }
        return PageRequest.of(page, size);
    }

    public Order updateOrderStatus(String orderId, String newStatus, String cancelReason, Integer weight, Integer length, Integer width, Integer height, String requiredNote) {
        return orderRepository.findById(orderId).map(order -> {
            try {
                Order.OrderStatus status = Order.OrderStatus.valueOf(newStatus.toUpperCase());
                if (status == order.getStatus()) {
                    return order;
                }
                if (!OrderStatusTransitionPolicy.isAdminTransitionAllowed(order.getStatus(), status)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Chuyển trạng thái không hợp lệ; trạng thái giao vận do GHN cập nhật");
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
                        releaseVoucherIfNeeded(order);
                    }
                }
                // Rule for PROCESSING orders
                if (order.getStatus() == Order.OrderStatus.PROCESSING) {
                    if (status != Order.OrderStatus.DELIVERING) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn đang chuẩn bị chỉ có thể chuyển sang Đang vận chuyển");
                    }
                    if (weight == null || weight <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập khối lượng kiện hàng (gram)");
                    }
                }
                // GHN Integration
                if (status == Order.OrderStatus.DELIVERING && order.getStatus() == Order.OrderStatus.PROCESSING) {
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
                    // Đi bộ / Chuẩn
                    ghnData.put("service_type_id", 2);
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
                        // Mã sản phẩm
                        map.put("code", item.getProductId());
                        map.put("quantity", item.getQuantity());
                        map.put("price", item.getUnitPrice().intValue());
                        // Cân nặng chia đều theo tổng
                        map.put("weight", itemWeight > 0 ? itemWeight : 50);
                        return map;
                    }).collect(java.util.stream.Collectors.toList());
                    ghnData.put("items", ghnItems);
                    try {
                        Map<String, Object> ghnResponse = ghnService.createOrder(ghnData);
                        String trackingCode = ghnResponse != null ? (String) ghnResponse.get("order_code") : null;
                        order.setTrackingCode(trackingCode);
                    } catch (Exception e) {
                        log.error("Không thể tạo vận đơn GHN cho đơn {}", order.getOrderCode(), e);
                        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa thể tạo vận đơn GHN lúc này, vui lòng thử lại sau");
                    }
                }
                String note = "Cập nhật trạng thái";
                if (status == Order.OrderStatus.PROCESSING) {
                    note = "Đơn hàng đang chuẩn bị";
                } else if (status == Order.OrderStatus.DELIVERING) {
                    note = "Đơn đang vận chuyển";
                } else if (status == Order.OrderStatus.DELIVERED) {
                    note = "Khách hàng đã thanh toán và giao hàng thành công";
                } else if (status == Order.OrderStatus.CANCELLED && cancelReason != null && !cancelReason.trim().isEmpty()) {
                    note = "Hủy đơn: " + cancelReason;
                }
                order.addStatusHistory(status, note);
                // Update payment status for CANCELLED/REFUSED/RETURNED
                if ((status == Order.OrderStatus.CANCELLED || status == Order.OrderStatus.REFUSED || status == Order.OrderStatus.RETURNED) && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                    order.setPaymentStatus(Order.PaymentStatus.FAILED);
                }
                if (status == Order.OrderStatus.CANCELLED || status == Order.OrderStatus.RETURNED) {
                    releaseInventoryIfNeeded(order);
                    releaseVoucherIfNeeded(order);
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

    // Chạy mỗi 1 phút
    @Scheduled(fixedRate = 60000)
    public void autoCancelUnpaidOrders() {
        LocalDateTime threshold = LocalDateTime.now();
        List<Order> expiredOrders = orderRepository.findExpiredUnpaidOrders(threshold);
        for (Order order : expiredOrders) {
            order.addStatusHistory(Order.OrderStatus.CANCELLED, "Hủy tự động do quá hạn thanh toán 15 phút");
            order.setCancelReason("Hủy tự động do quá hạn thanh toán 15 phút");
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
            releaseInventoryIfNeeded(order);
            releaseVoucherIfNeeded(order);
            orderRepository.save(order);
            log.info("Auto-cancelled unpaid order: {}", order.getOrderCode());
        }
    }

    // Chạy mỗi 5 phút
    @Scheduled(fixedRate = 300000)
    public void syncGhnOrderStatus() {
        List<Order> activeOrders = orderRepository.findActiveGhnOrders();
        for (Order order : activeOrders) {
            try {
                Map<String, Object> detail = ghnService.getOrderDetail(order.getTrackingCode());
                if (detail != null && detail.containsKey("status")) {
                    String ghnStatus = (String) detail.get("status");
                    Order.OrderStatus newStatus = mapGhnStatusToSystemStatus(ghnStatus);
                    if (newStatus != null && newStatus != order.getStatus()) {
                        String note = "Cập nhật trạng thái";
                        if (newStatus == Order.OrderStatus.REFUSED) {
                            note = "Khách hàng từ chối nhận hàng";
                        } else if (newStatus == Order.OrderStatus.RETURNED) {
                            note = "Đã hoàn hàng về kho";
                        } else if (newStatus == Order.OrderStatus.DELIVERED) {
                            note = "Khách hàng đã thanh toán và giao hàng thành công";
                        }
                        applyShippingStatus(order, newStatus, note);
                        log.info("Auto-synced GHN order {}: {} -> {}", order.getOrderCode(), ghnStatus, newStatus);
                    }
                }
            } catch (Exception e) {
                log.error("Error syncing GHN order {}: {}", order.getOrderCode(), e.getMessage());
            }
        }
    }

    public Order.OrderStatus mapGhnStatusToSystemStatus(String ghnStatus) {
        switch(ghnStatus) {
            case "ready_to_pick":
            case "picking":
            case "picked":
            case "storing":
            case "sorting":
            case "transporting":
            case "delivering":
            case "delivery_fail":
                return Order.OrderStatus.DELIVERING;
            case "delivered":
            case "deliveried":
                return Order.OrderStatus.DELIVERED;
            case "waiting_to_return":
            case "return":
            case "return_transporting":
            case "returning":
            case "return_fail":
            case "refused":
                return Order.OrderStatus.REFUSED;
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
        if (!OrderStatusTransitionPolicy.isCarrierTransitionAllowed(order.getStatus(), newStatus)) {
            log.warn("Ignored stale or invalid shipping transition for order {}: {} -> {}", order.getOrderCode(), order.getStatus(), newStatus);
            return order;
        }
        order.addStatusHistory(newStatus, note);
        if (newStatus == Order.OrderStatus.CANCELLED || newStatus == Order.OrderStatus.REFUSED || newStatus == Order.OrderStatus.RETURNED) {
            if (order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
            }
        }
        if (newStatus == Order.OrderStatus.CANCELLED || newStatus == Order.OrderStatus.RETURNED) {
            releaseInventoryIfNeeded(order);
            releaseVoucherIfNeeded(order);
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
