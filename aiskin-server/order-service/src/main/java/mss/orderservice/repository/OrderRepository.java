package mss.orderservice.repository;

import mss.orderservice.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

import org.springframework.data.mongodb.repository.Query;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {
    Optional<Order> findByOrderCode(String orderCode);
    Optional<Order> findByTrackingCode(String trackingCode);
    Optional<Order> findByCustomerIdAndIdempotencyKey(String customerId, String idempotencyKey);
    Page<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Order> findByStatusOrderByCreatedAtDesc(Order.OrderStatus status, Pageable pageable);
    Page<Order> findByCustomerIdAndStatusOrderByCreatedAtDesc(String customerId, Order.OrderStatus status, Pageable pageable);
    
    Page<Order> findByStatusInOrderByCreatedAtDesc(List<Order.OrderStatus> statuses, Pageable pageable);
    Page<Order> findByCustomerIdAndStatusInOrderByCreatedAtDesc(String customerId, List<Order.OrderStatus> statuses, Pageable pageable);

    @Query("{ 'status': 'PENDING', 'paymentMethod': { $ne: 'COD' }, 'paymentStatus': 'UNPAID', 'inventoryReserved': true, 'reservationExpiresAt': { $lt: ?0 } }")
    List<Order> findExpiredUnpaidOrders(LocalDateTime threshold);

    @Query("{ 'trackingCode': { $ne: null }, 'status': { $nin: ['DELIVERED', 'RETURNED', 'RECEIVED', 'CANCELLED'] } }")
    List<Order> findActiveGhnOrders();

    @Query("{ 'paymentStatus': 'PAID', 'createdAt': { $gte: ?0, $lte: ?1 } }")
    List<Order> findPaidOrdersBetween(LocalDateTime from, LocalDateTime to);

    @Query("{ 'paymentStatus': { $in: ['PAID'] }, 'status': { $nin: ['CANCELLED', 'REFUSED'] } }")
    List<Order> findAllPaidOrders();
}
