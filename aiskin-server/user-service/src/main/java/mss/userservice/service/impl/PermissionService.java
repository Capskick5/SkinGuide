package mss.userservice.service.impl;

import mss.userservice.dto.PermissionResponse;
import mss.userservice.dto.SyncEndpointsRequest;
import mss.userservice.model.Permission;
import mss.userservice.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;
import mss.userservice.service.*;

@Service
public class PermissionService implements IPermissionService {

    private final PermissionRepository permissionRepository;

    public PermissionService(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream().map(PermissionResponse::from).collect(Collectors.toList());
    }

    public void syncEndpoints(SyncEndpointsRequest request) {
        String serviceName = request.service();
        for (SyncEndpointsRequest.EndpointDto ep : request.endpoints()) {
            permissionRepository.findByResourceAndMethod(ep.path(), ep.method()).orElseGet(() -> {
                Permission newPerm = Permission.builder().name(serviceName + " - " + ep.method() + " " + ep.path()).resource(ep.path()).method(ep.method()).service(serviceName).description("Tự động đồng bộ từ " + serviceName).build();
                return permissionRepository.save(newPerm);
            });
        }
    }

    public PermissionResponse createPermission(mss.userservice.dto.PermissionRequest request) {
        if (permissionRepository.findByResourceAndMethod(request.resource(), request.method()).isPresent()) {
            throw new IllegalArgumentException("Permission với resource và method này đã tồn tại!");
        }
        Permission newPerm = Permission.builder().name(request.name()).resource(request.resource()).method(request.method()).service(request.service()).description(request.description()).build();
        return PermissionResponse.from(permissionRepository.save(newPerm));
    }
}
