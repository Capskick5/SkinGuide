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
    Page<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Order> findByStatusOrderByCreatedAtDesc(Order.OrderStatus status, Pageable pageable);
    Page<Order> findByCustomerIdAndStatusOrderByCreatedAtDesc(String customerId, Order.OrderStatus status, Pageable pageable);

    @Query("{ 'status': 'PENDING', 'paymentMethod': { $ne: 'COD' }, 'paymentStatus': 'UNPAID', 'createdAt': { $lt: ?0 } }")
    List<Order> findExpiredUnpaidOrders(LocalDateTime threshold);
}
