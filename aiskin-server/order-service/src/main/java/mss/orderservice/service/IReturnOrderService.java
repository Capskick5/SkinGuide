package mss.orderservice.service;

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

public interface IReturnOrderService {

    ReturnOrder createReturnRequest(String orderId, ReturnRequest request);

    List<ReturnOrder> getReturnsByCustomer(String customerId);

    Page<ReturnOrder> getAllReturns(int page, int size, String status);

    ReturnOrder getReturnByOrderId(String orderId);

    ReturnOrder updateReturnStatus(String id, ReturnOrder.ReturnStatus newStatus, String rejectReason, ReturnOrder.InventoryDisposition inventoryDisposition);

    ReturnOrder updateReturnRequest(String id, ReturnRequest request);

    void deleteReturnRequest(String id);

    ReturnOrder updateReturnTracking(String id, String courier, String trackingCode);

    void syncGhnReturnOrderStatus();
}
