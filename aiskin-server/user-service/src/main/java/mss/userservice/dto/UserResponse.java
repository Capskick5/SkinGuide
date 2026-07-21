// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.dto;

import mss.userservice.model.SkinProfile;
import mss.userservice.model.Address;
import mss.userservice.model.User;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Public view of a User (never exposes the password hash).
 */
public record UserResponse(
        String id,
        String email,
        String fullName,
        Set<String> roles,
        boolean active,
        boolean emailVerified,
        SkinProfile skinProfile,
        List<Address> addresses,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRoles() == null ? Set.of() : user.getRoles(),
                user.isActive(),
                user.isEmailVerified(),
                user.getSkinProfile(),
                user.getAddresses() == null ? List.of() : user.getAddresses(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
