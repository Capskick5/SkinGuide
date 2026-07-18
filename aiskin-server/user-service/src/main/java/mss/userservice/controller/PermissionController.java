package mss.userservice.controller;

import jakarta.validation.Valid;
import mss.userservice.dto.PermissionResponse;
import mss.userservice.dto.SyncEndpointsRequest;
import mss.userservice.service.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import mss.userservice.service.IPermissionService;

@RestController
@RequestMapping("/api/admin/permissions")
public class PermissionController {

    private final IPermissionService permissionService;

    public PermissionController(IPermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    @PreAuthorize("hasPermission('/api/admin/permissions', 'GET')")
    public List<PermissionResponse> getAllPermissions() {
        return permissionService.getAllPermissions();
    }

    @PostMapping("/sync")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasPermission('/api/admin/permissions/sync', 'POST')")
    public void syncEndpoints(@Valid @RequestBody SyncEndpointsRequest request) {
        permissionService.syncEndpoints(request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasPermission('/api/admin/permissions', 'POST')")
    public PermissionResponse createPermission(@Valid @RequestBody mss.userservice.dto.PermissionRequest request) {
        return permissionService.createPermission(request);
    }
}
