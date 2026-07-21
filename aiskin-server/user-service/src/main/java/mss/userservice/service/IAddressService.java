// Project: SkinGuide - MSS301
// Service Component

package mss.userservice.service;

import mss.userservice.dto.AddressRequest;
import mss.userservice.model.Address;

import java.util.List;

/**
 * Quản lý sổ địa chỉ giao hàng của người dùng (persist trên server, nhúng trong User).
 * Tất cả thao tác trả về danh sách địa chỉ hiện tại.
 */
public interface IAddressService {

    List<Address> list(String userId);

    List<Address> add(String userId, AddressRequest request);

    List<Address> update(String userId, String addressId, AddressRequest request);

    List<Address> remove(String userId, String addressId);

    List<Address> setDefault(String userId, String addressId);
}
