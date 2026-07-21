// Project: SkinGuide - MSS301
// Service Component

package mss.orderservice.repository;

import mss.orderservice.model.Voucher;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherRepository extends MongoRepository<Voucher, String> {
    Optional<Voucher> findByCodeIgnoreCase(String code);
}
