// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.dto;

import jakarta.validation.constraints.NotBlank;

public record RoleRequest(
    @NotBlank(message = "Tên role không được để trống")
    String name,
    String description
) {}
