// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.controller;

import jakarta.validation.Valid;
import mss.userservice.dto.RoleRequest;
import mss.userservice.dto.RoleResponse;
import mss.userservice.service.impl.RoleService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Set;
import mss.userservice.service.IRoleService;

@RestController
@RequestMapping("/api/admin/roles")
public class RoleController {

    private final IRoleService roleService;

    public RoleController(IRoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasPermission('/api/admin/roles', 'GET')")
    public List<RoleResponse> getAllRoles() {
        return roleService.getAllRoles();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasPermission('/api/admin/roles', 'POST')")
    public RoleResponse createRole(@Valid @RequestBody RoleRequest request) {
        return roleService.createRole(request);
    }

    @PostMapping("/{roleId}/permissions")
    @PreAuthorize("hasPermission('/api/admin/roles/{roleId}/permissions', 'POST')")
    public RoleResponse assignPermissions(@PathVariable String roleId, @RequestBody Set<String> permissionIds) {
        return roleService.assignPermissions(roleId, permissionIds);
    }
}
