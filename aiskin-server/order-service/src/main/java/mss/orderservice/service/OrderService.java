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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final MomoConfig momoConfig;
    private final RestTemplate restTemplate;

    public OrderService(OrderRepository orderRepository, MomoConfig momoConfig) {
        this.orderRepository = orderRepository;
        this.momoConfig = momoConfig;
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

        // 2. Generate Order Code
        String orderCode = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 3. Save Order
        Order order = Order.builder()
                .orderCode(orderCode)
                .customerId(request.getCustomerId())
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .shippingAddress(request.getShippingAddress())
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

    public List<Order> getOrdersByCustomerId(String customerId) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }
}
