package mss.orderservice.repository;

import mss.orderservice.model.ReturnOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnOrderRepository extends MongoRepository<ReturnOrder, String> {
    List<ReturnOrder> findByCustomerId(String customerId);
    Optional<ReturnOrder> findByOrderId(String orderId);
    List<ReturnOrder> findByStatus(ReturnOrder.ReturnStatus status);
    Optional<ReturnOrder> findByReturnTrackingCode(String returnTrackingCode);
    
    @org.springframework.data.mongodb.repository.Query("{ 'returnTrackingCode': { $exists: true, $ne: null }, 'status': { $nin: ['RECEIVED', 'REFUNDED', 'REJECTED'] } }")
    List<ReturnOrder> findActiveGhnReturns();

    Page<ReturnOrder> findAll(Pageable pageable);
    Page<ReturnOrder> findByStatusIn(List<ReturnOrder.ReturnStatus> statuses, Pageable pageable);

    @org.springframework.data.mongodb.repository.Query("{ 'status': { $in: ['DELIVERING', 'DELIVERED', 'RECEIVED', 'REFUNDED'] } }")
    List<ReturnOrder> findCompletedReturns();

    @org.springframework.data.mongodb.repository.Query("{ 'status': 'REFUNDED' }")
    List<ReturnOrder> findRefundedReturns();
}
