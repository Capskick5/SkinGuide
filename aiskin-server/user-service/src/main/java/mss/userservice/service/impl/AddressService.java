// Project: SkinGuide - MSS301
// Service Component

package mss.userservice.service.impl;

import mss.userservice.dto.AddressRequest;
import mss.userservice.exception.ApiException;
import mss.userservice.model.Address;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.service.IAddressService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AddressService implements IAddressService {

    private final UserRepository userRepository;

    public AddressService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public List<Address> list(String userId) {
        return loadUser(userId).getAddresses();
    }

    @Override
    public List<Address> add(String userId, AddressRequest request) {
        User user = loadUser(userId);
        List<Address> addresses = user.getAddresses();

        Address address = toAddress(request);
        address.setId(UUID.randomUUID().toString());
        // Địa chỉ đầu tiên của user tự động trở thành mặc định.
        address.setDefault(addresses.isEmpty());
        addresses.add(address);

        return userRepository.save(user).getAddresses();
    }

    @Override
    public List<Address> update(String userId, String addressId, AddressRequest request) {
        User user = loadUser(userId);
        Address existing = findAddress(user, addressId);

        existing.setLabel(request.label());
        existing.setCustomerName(request.customerName());
        existing.setCustomerPhone(request.customerPhone());
        existing.setProvinceCode(request.provinceCode());
        existing.setCity(request.city());
        existing.setDistrictCode(request.districtCode());
        existing.setDistrict(request.district());
        existing.setWardCode(request.wardCode());
        existing.setWard(request.ward());
        existing.setAddressDetail(request.addressDetail());

        return userRepository.save(user).getAddresses();
    }

    @Override
    public List<Address> remove(String userId, String addressId) {
        User user = loadUser(userId);
        List<Address> addresses = user.getAddresses();
        Address removed = findAddress(user, addressId);

        addresses.remove(removed);
        // Nếu địa chỉ vừa xóa là mặc định, chuyển mặc định sang địa chỉ đầu tiên còn lại.
        if (removed.isDefault() && !addresses.isEmpty()) {
            addresses.get(0).setDefault(true);
        }

        return userRepository.save(user).getAddresses();
    }

    @Override
    public List<Address> setDefault(String userId, String addressId) {
        User user = loadUser(userId);
        List<Address> addresses = user.getAddresses();
        findAddress(user, addressId); // ném lỗi nếu addressId không tồn tại

        addresses.forEach(address -> address.setDefault(address.getId().equals(addressId)));

        return userRepository.save(user).getAddresses();
    }

    private Address toAddress(AddressRequest request) {
        return Address.builder()
                .label(request.label())
                .customerName(request.customerName())
                .customerPhone(request.customerPhone())
                .provinceCode(request.provinceCode())
                .city(request.city())
                .districtCode(request.districtCode())
                .district(request.district())
                .wardCode(request.wardCode())
                .ward(request.ward())
                .addressDetail(request.addressDetail())
                .build();
    }

    private Address findAddress(User user, String addressId) {
        return user.getAddresses().stream()
                .filter(address -> address.getId().equals(addressId))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Địa chỉ không tồn tại"));
    }

    private User loadUser(String userId) {
        return userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Người dùng không tồn tại"));
    }
}
