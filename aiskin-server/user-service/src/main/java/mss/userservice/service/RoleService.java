package mss.userservice.service;

import mss.userservice.dto.RoleRequest;
import mss.userservice.dto.RoleResponse;
import mss.userservice.exception.ApiException;
import mss.userservice.model.Role;
import mss.userservice.repository.RoleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(RoleResponse::from)
                .collect(Collectors.toList());
    }

    public RoleResponse createRole(RoleRequest request) {
        if (roleRepository.findByName(request.name().toUpperCase()).isPresent()) {
            throw ApiException.badRequest("Role đã tồn tại");
        }
        Role role = Role.builder()
                .name(request.name().toUpperCase())
                .description(request.description())
                .build();
        return RoleResponse.from(roleRepository.save(role));
    }

    public RoleResponse assignPermissions(String roleId, Set<String> permissionIds) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> ApiException.notFound("Role không tồn tại"));
        role.setPermissions(permissionIds);
        return RoleResponse.from(roleRepository.save(role));
    }
    
    public void initDefaultRoles() {
        if (roleRepository.findByName("USER").isEmpty()) {
            roleRepository.save(Role.builder().name("USER").description("Người dùng cơ bản").build());
        }
        if (roleRepository.findByName("ADMIN").isEmpty()) {
            roleRepository.save(Role.builder().name("ADMIN").description("Quản trị viên hệ thống").build());
        }
    }
}
