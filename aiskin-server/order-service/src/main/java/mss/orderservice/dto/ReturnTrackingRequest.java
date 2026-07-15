package mss.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReturnTrackingRequest(
        @NotBlank(message = "Đơn vị vận chuyển là bắt buộc")
        @Size(max = 80, message = "Đơn vị vận chuyển tối đa 80 ký tự")
        String courier,

        @NotBlank(message = "Mã vận đơn là bắt buộc")
        @Size(max = 100, message = "Mã vận đơn tối đa 100 ký tự")
        String trackingCode
) {
}
