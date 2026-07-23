package mss.orderservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import mss.orderservice.model.ReturnOrder;

public record ReturnResolutionRequest(
        @NotNull(message = "Phương án xử lý là bắt buộc")
        ReturnOrder.ResolutionType resolution,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
        String note
) {
}
