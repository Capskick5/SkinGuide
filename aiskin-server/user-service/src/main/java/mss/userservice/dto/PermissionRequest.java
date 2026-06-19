package mss.userservice.dto;

import jakarta.validation.constraints.NotBlank;

public record PermissionRequest(
        @NotBlank(message = "Name cannot be blank")
        String name,
        @NotBlank(message = "Resource path cannot be blank")
        String resource,
        @NotBlank(message = "HTTP Method cannot be blank")
        String method,
        String service,
        String description
) {}
