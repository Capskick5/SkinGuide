// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.repository;

import mss.userservice.model.Favorite;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FavoriteRepository extends MongoRepository<Favorite, String> {

    List<Favorite> findByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByUserIdAndProductId(String userId, String productId);

    void deleteByUserIdAndProductId(String userId, String productId);

    void deleteByUserId(String userId);
}
