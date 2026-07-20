// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB Document cho sản phẩm yêu thích của người dùng.
 * Mỗi bản ghi là một cặp (userId, productId) — một sản phẩm được yêu thích bởi một user.
 * Ràng buộc duy nhất (userId, productId) để tránh trùng lặp khi toggle nhiều lần.
 */
@Document(collection = "favorites")
@CompoundIndex(name = "uniq_user_product", def = "{'userId': 1, 'productId': 1}", unique = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Favorite {

    @Id
    private String id;

    private String userId;

    private String productId;

    private Instant createdAt;
}
