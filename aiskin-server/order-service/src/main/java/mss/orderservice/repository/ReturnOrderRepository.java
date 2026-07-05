package mss.orderservice.repository;

import mss.orderservice.model.ReturnOrder;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnOrderRepository extends MongoRepository<ReturnOrder, String> {
    List<ReturnOrder> findByCustomerId(String customerId);
    Optional<ReturnOrder> findByOrderId(String orderId);
    List<ReturnOrder> findByStatus(ReturnOrder.ReturnStatus status);
}
