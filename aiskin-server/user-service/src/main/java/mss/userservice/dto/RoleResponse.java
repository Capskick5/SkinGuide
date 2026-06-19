package mss.userservice.dto;

import mss.userservice.model.Role;

import java.util.HashSet;
import java.util.Set;

public record RoleResponse(
    String id,
    String name,
    String description,
    Set<String> permissions
) {
    public static RoleResponse from(Role role) {
        if (role == null) return null;
        return new RoleResponse(
            role.getId(),
            role.getName(),
            role.getDescription(),
            role.getPermissions() != null ? role.getPermissions() : new HashSet<>()
        );
    }
}
