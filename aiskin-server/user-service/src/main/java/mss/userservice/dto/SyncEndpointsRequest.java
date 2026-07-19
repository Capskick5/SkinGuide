// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SyncEndpointsRequest(
    @NotBlank(message = "Service name không được để trống")
    String service,

    @NotNull(message = "Danh sách endpoints không được null")
    List<EndpointDto> endpoints
) {
    public record EndpointDto(
        @NotBlank(message = "Method không được để trống")
        String method,

        @NotBlank(message = "Path không được để trống")
        String path
    ) {}
}
