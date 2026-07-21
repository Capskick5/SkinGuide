package mss.userservice.service.impl;

import mss.userservice.dto.AddressRequest;
import mss.userservice.exception.ApiException;
import mss.userservice.model.Address;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AddressServiceTest {

    private final UserRepository repository = mock(UserRepository.class);
    private final AddressService service = new AddressService(repository);

    private static AddressRequest sampleRequest(String name) {
        return new AddressRequest(
                "Nhà",
                name,
                "0901234567",
                "202",
                "Hồ Chí Minh",
                "1442",
                "Quận 1",
                "20101",
                "Phường Bến Nghé",
                "12 Nguyễn Huệ"
        );
    }

    private static User userWithAddresses(Address... addresses) {
        User user = User.builder().id("user-1").email("user@example.com").build();
        user.setAddresses(new ArrayList<>(List.of(addresses)));
        return user;
    }

    @Test
    void addFirstAddressAutoSetsDefault() {
        User user = userWithAddresses();
        when(repository.findById("user-1")).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        List<Address> result = service.add("user-1", sampleRequest("Nguyễn Nhật Huy"));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isDefault()).isTrue();
        assertThat(result.get(0).getId()).isNotBlank();
    }

    @Test
    void addSecondAddressDoesNotBecomeDefault() {
        Address first = Address.builder().id("a-1").customerName("A").isDefault(true).build();
        User user = userWithAddresses(first);
        when(repository.findById("user-1")).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        List<Address> result = service.add("user-1", sampleRequest("Người thứ hai"));

        assertThat(result).hasSize(2);
        assertThat(result.get(1).isDefault()).isFalse();
        assertThat(result.get(0).isDefault()).isTrue();
    }

    @Test
    void updateModifiesExistingAddressFields() {
        Address existing = Address.builder().id("a-1").customerName("Cũ").customerPhone("0900000000").isDefault(true).build();
        User user = userWithAddresses(existing);
        when(repository.findById("user-1")).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        List<Address> result = service.update("user-1", "a-1", sampleRequest("Đã cập nhật"));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCustomerName()).isEqualTo("Đã cập nhật");
        assertThat(result.get(0).getCustomerPhone()).isEqualTo("0901234567");
        assertThat(result.get(0).isDefault()).isTrue();
    }

    @Test
    void updateThrowsWhenAddressNotFound() {
        User user = userWithAddresses();
        when(repository.findById("user-1")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.update("user-1", "missing", sampleRequest("X")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Địa chỉ không tồn tại");
    }

    @Test
    void removeDefaultAddressPromotesFirstRemaining() {
        Address defaultAddress = Address.builder().id("a-1").customerName("A").isDefault(true).build();
        Address other = Address.builder().id("a-2").customerName("B").isDefault(false).build();
        User user = userWithAddresses(defaultAddress, other);
        when(repository.findById("user-1")).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        List<Address> result = service.remove("user-1", "a-1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("a-2");
        assertThat(result.get(0).isDefault()).isTrue();
    }

    @Test
    void removeNonDefaultAddressLeavesDefaultUnchanged() {
        Address defaultAddress = Address.builder().id("a-1").customerName("A").isDefault(true).build();
        Address other = Address.builder().id("a-2").customerName("B").isDefault(false).build();
        User user = userWithAddresses(defaultAddress, other);
        when(repository.findById("user-1")).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        List<Address> result = service.remove("user-1", "a-2");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("a-1");
        assertThat(result.get(0).isDefault()).isTrue();
    }

    @Test
    void setDefaultUnsetsOtherAddresses() {
        Address a1 = Address.builder().id("a-1").customerName("A").isDefault(true).build();
        Address a2 = Address.builder().id("a-2").customerName("B").isDefault(false).build();
        User user = userWithAddresses(a1, a2);
        when(repository.findById("user-1")).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        List<Address> result = service.setDefault("user-1", "a-2");

        assertThat(result.stream().filter(Address::isDefault).map(Address::getId)).containsExactly("a-2");
    }

    @Test
    void setDefaultThrowsWhenAddressNotFound() {
        User user = userWithAddresses(Address.builder().id("a-1").customerName("A").isDefault(true).build());
        when(repository.findById("user-1")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.setDefault("user-1", "missing"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Địa chỉ không tồn tại");
    }
}
