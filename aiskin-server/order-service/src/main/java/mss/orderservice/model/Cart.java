// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Giỏ hàng lưu trên server cho người dùng đã đăng nhập.
 * Mỗi user có tối đa một giỏ (ràng buộc unique userId).
 *
 * Giỏ đóng vai trò "kho lưu" tiện lợi để đồng bộ đa thiết bị — mỗi phần tử là snapshot
 * dòng hàng do frontend chuẩn hóa (id, variantId, qty, price, tên, ảnh...). Giá và tồn kho
 * được kiểm chứng lại ở bước checkout (reserve), nên giỏ không cần chứa logic nghiệp vụ.
 */
@Document(collection = "carts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cart {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Builder.Default
    private List<Map<String, Object>> items = new ArrayList<>();

    private Instant updatedAt;
}
