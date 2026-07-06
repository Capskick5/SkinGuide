package mss.orderservice.repository;

import mss.orderservice.model.RefundRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRequestRepository extends MongoRepository<RefundRequest, String> {
    List<RefundRequest> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    Optional<RefundRequest> findByReturnOrderId(String returnOrderId);

    @org.springframework.data.mongodb.repository.Query("{ 'status': 'COMPLETED' }")
    List<RefundRequest> findCompletedRefunds();
}
