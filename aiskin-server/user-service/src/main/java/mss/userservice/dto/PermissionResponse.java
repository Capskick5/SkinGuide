package mss.userservice.dto;

import mss.userservice.model.Permission;

public record PermissionResponse(
    String id,
    String name,
    String resource,
    String method,
    String service,
    String description
) {
    public static PermissionResponse from(Permission p) {
        if (p == null) return null;
        return new PermissionResponse(
            p.getId(),
            p.getName(),
            p.getResource(),
            p.getMethod(),
            p.getService(),
            p.getDescription()
        );
    }
}
