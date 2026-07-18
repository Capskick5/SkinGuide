package mss.userservice.service;

import mss.userservice.dto.PermissionResponse;
import mss.userservice.dto.SyncEndpointsRequest;
import mss.userservice.model.Permission;
import mss.userservice.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

public interface IPermissionService {

    List<PermissionResponse> getAllPermissions();

    void syncEndpoints(SyncEndpointsRequest request);

    PermissionResponse createPermission(mss.userservice.dto.PermissionRequest request);
}
