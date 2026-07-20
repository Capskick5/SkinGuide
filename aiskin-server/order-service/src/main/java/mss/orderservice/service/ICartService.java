// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service;

import java.util.List;
import java.util.Map;

/**
 * Lưu/đọc giỏ hàng trên server cho người dùng đã đăng nhập.
 * Server đóng vai trò kho lưu; toàn bộ logic gộp/số lượng nằm ở frontend.
 */
public interface ICartService {

    List<Map<String, Object>> get(String userId);

    /** Thay thế toàn bộ giỏ bằng danh sách dòng hàng do client gửi lên. */
    List<Map<String, Object>> replace(String userId, List<Map<String, Object>> items);

    void clear(String userId);
}
