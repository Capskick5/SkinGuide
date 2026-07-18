package mss.userservice.service.impl;
import mss.userservice.service.*;


import mss.userservice.model.DeliveryAddress;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.repository.RoleRepository;
import mss.userservice.security.RefreshTokenStore;
import mss.userservice.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    @Test
    void updateDeliveryAddressStoresAddressOnUser() {
        UserRepository repository = mock(UserRepository.class);
        UserService service = new UserService(
                repository,
                mock(RoleRepository.class),
                mock(PasswordEncoder.class),
                mock(RefreshTokenStore.class)
        );
        User user = User.builder().id("user-1").email("user@example.com").build();
        DeliveryAddress address = new DeliveryAddress(
                "Nguyễn Nhật Huy",
                "0901234567",
                "202",
                "Hồ Chí Minh",
                "1442",
                "Quận 1",
                "20101",
                "Phường Bến Nghé",
                "12 Nguyễn Huệ"
        );

        when(repository.findById("user-1")).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        DeliveryAddress result = service.updateDeliveryAddress("user-1", address);

        assertEquals(address, result);
        assertEquals(address, user.getDeliveryAddress());
        verify(repository).save(user);
    }

    @Test
    void capsAdminUserPageSize() {
        UserRepository repository = mock(UserRepository.class);
        UserService service = new UserService(
                repository,
                mock(RoleRepository.class),
                mock(PasswordEncoder.class),
                mock(RefreshTokenStore.class)
        );
        when(repository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(java.util.List.of()));

        service.listUsers(null, PageRequest.of(0, 10_000));

        org.mockito.ArgumentCaptor<Pageable> captor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(captor.capture());
        assertEquals(100, captor.getValue().getPageSize());
    }

    @Test
    void rejectsRoleThatDoesNotExist() {
        UserRepository repository = mock(UserRepository.class);
        RoleRepository roleRepository = mock(RoleRepository.class);
        UserService service = new UserService(
                repository,
                roleRepository,
                mock(PasswordEncoder.class),
                mock(RefreshTokenStore.class)
        );
        when(roleRepository.findByName("MADE_UP_ROLE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setRole("user-1", "made_up_role"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Role không tồn tại");
        verify(repository, org.mockito.Mockito.never()).save(org.mockito.ArgumentMatchers.any());
    }
}


