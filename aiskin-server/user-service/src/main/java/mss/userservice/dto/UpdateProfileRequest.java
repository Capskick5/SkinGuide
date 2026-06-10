package mss.userservice.dto;

import mss.userservice.model.SkinProfile;

/**
 * Payload for PUT /api/users/me (authenticated).
 * All fields optional; only non-null values are applied.
 */
public record UpdateProfileRequest(
        String fullName,
        SkinProfile skinProfile
) {
}
