package mss.orderservice.service;

import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.MomoEncoderUtils;
import mss.orderservice.dto.MomoPaymentRequest;
import mss.orderservice.dto.MomoPaymentResponse;
import mss.orderservice.dto.OrderRequest;
import mss.orderservice.dto.OrderResponse;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.repository.OrderRepository;
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
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final MomoConfig momoConfig;
    private final GhnService ghnService;
    private final RestTemplate restTemplate;

    public OrderService(OrderRepository orderRepository, MomoConfig momoConfig, GhnService ghnService) {
        this.orderRepository = orderRepository;
        this.momoConfig = momoConfig;
        this.ghnService = ghnService;
        this.restTemplate = new RestTemplate();
    }

    public OrderResponse createOrder(OrderRequest request) {
        // 1. Calculate Total Amount
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> items = request.getItems().stream().map(req -> {
            BigDecimal subTotal = req.getUnitPrice().multiply(new BigDecimal(req.getQuantity()));
            return OrderItem.builder()
                    .productId(req.getProductId())
                    .productName(req.getProductName())
                    .imageUrl(req.getImageUrl())
                    .quantity(req.getQuantity())
                    .unit(req.getUnit())
                    .unitPrice(req.getUnitPrice())
                    .subTotal(subTotal)
                    .build();
        }).collect(Collectors.toList());

        for (OrderItem item : items) {
            totalAmount = totalAmount.add(item.getSubTotal());
        }
        
        if (request.getShippingFee() != null) {
            totalAmount = totalAmount.add(request.getShippingFee());
        }

        // 2. Generate Order Code
        String orderCode = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 3. Save Order
        Order order = Order.builder()
                .orderCode(orderCode)
                .customerId(request.getCustomerId())
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .shippingAddress(request.getShippingAddress())
                .ghnDistrictId(request.getGhnDistrictId())
                .ghnWardCode(request.getGhnWardCode())
                .shippingFee(request.getShippingFee())
                .items(items)
                .totalAmount(totalAmount)
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        orderRepository.save(order);

        // 4. Handle Payment Method
        String paymentUrl = "";
        if (request.getPaymentMethod() == Order.PaymentMethod.MOMO) {
            paymentUrl = generateMomoPaymentUrl(order);
        }

        return OrderResponse.builder()
                .orderCode(orderCode)
                .status(order.getStatus().name())
                .paymentUrl(paymentUrl)
                .build();
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
    
    public OrderResponse cancelOrder(String orderId, String cancelReason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with id: " + orderId));
        
        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể hủy đơn hàng đang chờ duyệt");
        }
        
        if (cancelReason == null || cancelReason.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng cung cấp lý do hủy đơn");
        }
        
        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setCancelReason(cancelReason);
        
        if (order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
        }
        
        orderRepository.save(order);
        
        return OrderResponse.builder()
                .orderCode(order.getOrderCode())
                .status(order.getStatus().name())
                .build();
    }

    public void processMomoIpn(String orderId, Integer resultCode) {
        orderRepository.findByOrderCode(orderId).ifPresent(order -> {
            if (resultCode == 0) {
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                order.setStatus(Order.OrderStatus.PROCESSING); // Move to next step
            } else {
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
            }
            orderRepository.save(order);
        });
    }

    public Order getOrderById(String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public Page<Order> getOrdersByCustomerId(String customerId, int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
                return orderRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, orderStatus, pageable);
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
                Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
                return orderRepository.findByStatusOrderByCreatedAtDesc(orderStatus, pageable);
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
                    if (status == Order.OrderStatus.CANCELLED) {
                        if (cancelReason == null || cancelReason.trim().isEmpty()) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần cung cấp lý do hủy đơn");
                        }
                        order.setCancelReason(cancelReason);
                    }
                }

                // Rule for PROCESSING orders
                if (order.getStatus() == Order.OrderStatus.PROCESSING) {
                    if (status != Order.OrderStatus.READY_TO_SHIP) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn đang chuẩn bị chỉ có thể chuyển sang Chờ lấy hàng");
                    }
                    if (weight == null || weight <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập khối lượng kiện hàng (gram)");
                    }
                }
                
                // GHN Integration
                if (status == Order.OrderStatus.READY_TO_SHIP && order.getStatus() == Order.OrderStatus.PROCESSING) {
                    if (order.getGhnWardCode() == null || order.getGhnDistrictId() == null) {
                         throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không có mã địa chỉ GHN. Không thể tạo đơn.");
                    }
                    
                    java.util.Map<String, Object> ghnData = new java.util.HashMap<>();
                    ghnData.put("payment_type_id", order.getPaymentMethod() == Order.PaymentMethod.COD ? 2 : 1);
                    ghnData.put("required_note", requiredNote != null ? requiredNote : "CHOXEMHANGKHONGTHU");
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
                    
                    java.util.List<java.util.Map<String, Object>> ghnItems = order.getItems().stream().map(item -> {
                        java.util.Map<String, Object> map = new java.util.HashMap<>();
                        map.put("name", item.getProductName());
                        map.put("quantity", item.getQuantity());
                        map.put("price", item.getUnitPrice().intValue());
                        map.put("weight", 50); // Mặc định mỗi món 50g
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
                
                order.setStatus(status);
                
                // Update payment status for CANCELLED/REFUSED
                if ((status == Order.OrderStatus.CANCELLED || status == Order.OrderStatus.REFUSED) 
                    && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                    order.setPaymentStatus(Order.PaymentStatus.FAILED);
                }
                
                // Update payment status for DELIVERED COD
                if (status == Order.OrderStatus.DELIVERED && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
                    order.setPaymentStatus(Order.PaymentStatus.PAID);
                }

                return orderRepository.save(order);
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid order status: " + newStatus);
            }
        }).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with id: " + orderId));
    }

    @Scheduled(fixedRate = 60000) // Chạy mỗi 1 phút
    public void autoCancelUnpaidOrders() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);
        List<Order> expiredOrders = orderRepository.findExpiredUnpaidOrders(threshold);
        for (Order order : expiredOrders) {
            order.setStatus(Order.OrderStatus.CANCELLED);
            order.setCancelReason("Đơn hàng chưa được thanh toán");
            order.setPaymentStatus(Order.PaymentStatus.FAILED);
            orderRepository.save(order);
            System.out.println("Auto cancelled order: " + order.getOrderCode());
        }
    }
}
