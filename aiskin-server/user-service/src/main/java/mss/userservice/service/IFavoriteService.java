// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.service;

import java.util.List;

/**
 * Quản lý danh sách sản phẩm yêu thích của người dùng (persist trên server).
 * Tất cả thao tác trả về danh sách productId hiện tại (mới nhất trước).
 */
public interface IFavoriteService {

    List<String> list(String userId);

    List<String> add(String userId, String productId);

    List<String> remove(String userId, String productId);

    /** Gộp danh sách yêu thích từ localStorage của khách vào server khi đăng nhập. */
    List<String> merge(String userId, List<String> productIds);

    void clear(String userId);
}
