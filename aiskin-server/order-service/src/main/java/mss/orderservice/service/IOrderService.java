package mss.orderservice.service;

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

public interface IOrderService {

    OrderResponse createOrder(OrderRequest request, String idempotencyKey);

    OrderResponse cancelOrder(String orderId, String cancelReason);

    PaymentProcessingResult processMomoIpn(String orderId, int resultCode, long amount, String transactionId);

    PaymentProcessingResult processVnpayIpn(String orderId, String responseCode, String transactionStatus, long amountTimes100, String transactionId);

    PaymentProcessingResult simulateBankTransfer(String orderCode);

    Order getOrderById(String idOrCode);

    String getPaymentUrlForOrder(String orderId);

    Page<Order> getOrdersByCustomerId(String customerId, int page, int size, String status);

    Page<Order> getAllOrders(int page, int size, String status);

    Order updateOrderStatus(String orderId, String newStatus, String cancelReason, Integer weight, Integer length, Integer width, Integer height, String requiredNote);

    void autoCancelUnpaidOrders();

    void syncGhnOrderStatus();

    Order.OrderStatus mapGhnStatusToSystemStatus(String ghnStatus);

    Order applyShippingStatus(Order order, Order.OrderStatus newStatus, String note);
}
