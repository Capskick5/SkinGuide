// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.repository;

import mss.orderservice.model.CompensationOrder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CompensationOrderRepository extends MongoRepository<CompensationOrder, String> {

    Optional<CompensationOrder> findByReturnOrderId(String returnOrderId);

    Optional<CompensationOrder> findByOrderId(String orderId);

    List<CompensationOrder> findByCustomerId(String customerId);

    List<CompensationOrder> findByStatus(CompensationOrder.CompensationStatus status);
    List<CompensationOrder> findByStatusIn(List<CompensationOrder.CompensationStatus> statuses);

    Optional<CompensationOrder> findByTrackingCode(String trackingCode);
}
