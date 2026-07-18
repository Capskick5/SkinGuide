package mss.userservice.service;

import mss.userservice.dto.RoleRequest;
import mss.userservice.dto.RoleResponse;
import mss.userservice.exception.ApiException;
import mss.userservice.model.Role;
import mss.userservice.repository.RoleRepository;
import mss.userservice.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RoleService implements IRoleService {

    private final RoleRepository roleRepository;

    private final PermissionRepository permissionRepository;

    public RoleService(RoleRepository roleRepository, PermissionRepository permissionRepository) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream().map(RoleResponse::from).collect(Collectors.toList());
    }

    public RoleResponse createRole(RoleRequest request) {
        if (roleRepository.findByName(request.name().toUpperCase()).isPresent()) {
            throw ApiException.badRequest("Role đã tồn tại");
        }
        Role role = Role.builder().name(request.name().toUpperCase()).description(request.description()).build();
        return RoleResponse.from(roleRepository.save(role));
    }

    public RoleResponse assignPermissions(String roleId, Set<String> permissionIds) {
        Role role = roleRepository.findById(roleId).orElseThrow(() -> ApiException.notFound("Role không tồn tại"));
        Set<String> requestedIds = permissionIds == null ? Set.of() : Set.copyOf(permissionIds);
        Set<String> existingIds = permissionRepository.findAllById(requestedIds).stream().map(mss.userservice.model.Permission::getId).collect(Collectors.toSet());
        if (!existingIds.equals(requestedIds)) {
            throw ApiException.badRequest("Danh sách permission có phần tử không tồn tại");
        }
        role.setPermissions(requestedIds);
        return RoleResponse.from(roleRepository.save(role));
    }

    public void initDefaultRoles() {
        if (roleRepository.findByName("USER").isEmpty()) {
            roleRepository.save(Role.builder().name("USER").description("Người dùng cơ bản").build());
        }
        if (roleRepository.findByName("MANAGER").isEmpty()) {
            roleRepository.save(Role.builder().name("MANAGER").description("Quản lý cửa hàng").build());
        }
        if (roleRepository.findByName("ADMIN").isEmpty()) {
            roleRepository.save(Role.builder().name("ADMIN").description("Quản trị viên hệ thống").build());
        }
    }
}
