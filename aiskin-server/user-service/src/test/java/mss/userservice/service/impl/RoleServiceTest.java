package mss.userservice.service.impl;
import mss.userservice.service.*;


import mss.userservice.exception.ApiException;
import mss.userservice.model.Permission;
import mss.userservice.model.Role;
import mss.userservice.repository.PermissionRepository;
import mss.userservice.repository.RoleRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RoleServiceTest {

    @Test
    void rejectsUnknownPermissionIds() {
        RoleRepository roleRepository = mock(RoleRepository.class);
        PermissionRepository permissionRepository = mock(PermissionRepository.class);
        Role role = Role.builder().id("role-1").name("MANAGER").build();
        Permission existing = Permission.builder().id("permission-1").build();
        when(roleRepository.findById("role-1")).thenReturn(Optional.of(role));
        when(permissionRepository.findAllById(Set.of("permission-1", "missing")))
                .thenReturn(List.of(existing));
        RoleService service = new RoleService(roleRepository, permissionRepository);

        assertThatThrownBy(() -> service.assignPermissions(
                "role-1", Set.of("permission-1", "missing")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("permission");
        verify(roleRepository, never()).save(role);
    }
}


