// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.service.impl;

import mss.userservice.model.Favorite;
import mss.userservice.repository.FavoriteRepository;
import mss.userservice.service.IFavoriteService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class FavoriteService implements IFavoriteService {

    private final FavoriteRepository favoriteRepository;

    public FavoriteService(FavoriteRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    @Override
    public List<String> list(String userId) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(Favorite::getProductId)
                .toList();
    }

    @Override
    public List<String> add(String userId, String productId) {
        saveIfAbsent(userId, productId);
        return list(userId);
    }

    @Override
    public List<String> remove(String userId, String productId) {
        favoriteRepository.deleteByUserIdAndProductId(userId, productId);
        return list(userId);
    }

    @Override
    public List<String> merge(String userId, List<String> productIds) {
        if (productIds != null) {
            productIds.stream()
                    .filter(id -> id != null && !id.isBlank())
                    .forEach(id -> saveIfAbsent(userId, id));
        }
        return list(userId);
    }

    @Override
    public void clear(String userId) {
        favoriteRepository.deleteByUserId(userId);
    }

    /** Thêm một sản phẩm nếu chưa có; bỏ qua nếu đã tồn tại (idempotent). */
    private void saveIfAbsent(String userId, String productId) {
        if (favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            return;
        }
        try {
            favoriteRepository.save(Favorite.builder()
                    .userId(userId)
                    .productId(productId)
                    .createdAt(Instant.now())
                    .build());
        } catch (DuplicateKeyException ignored) {
            // Cặp (userId, productId) đã tồn tại do race condition — bỏ qua an toàn.
        }
    }
}
