package mss.productservice.repository;

import mss.productservice.model.InventoryMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryMovementRepository extends MongoRepository<InventoryMovement, String> {

    Page<InventoryMovement> findByProductIdOrderByCreatedAtDesc(String productId, Pageable pageable);

    Page<InventoryMovement> findByProductIdAndVariantIdOrderByCreatedAtDesc(String productId, String variantId, Pageable pageable);

    Page<InventoryMovement> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<InventoryMovement> findByReferenceTypeAndReferenceIdAndType(
            String referenceType,
            String referenceId,
            InventoryMovement.MovementType type);
}
