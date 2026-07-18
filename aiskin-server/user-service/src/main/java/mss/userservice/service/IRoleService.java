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

public interface IRoleService {

    List<RoleResponse> getAllRoles();

    RoleResponse createRole(RoleRequest request);

    RoleResponse assignPermissions(String roleId, Set<String> permissionIds);

    void initDefaultRoles();
}
