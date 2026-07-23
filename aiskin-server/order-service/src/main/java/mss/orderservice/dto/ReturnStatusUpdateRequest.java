// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import mss.orderservice.model.ReturnOrder;

public record ReturnStatusUpdateRequest(
        @NotNull(message = "Trạng thái là bắt buộc")
        ReturnOrder.ReturnStatus status,

        @Size(max = 500, message = "Lý do từ chối tối đa 500 ký tự")
        String rejectReason,

        ReturnOrder.InventoryDisposition inventoryDisposition,

        // Ghi chú kiểm tra thực tế - bắt buộc khi chuyển sang INSPECTION_FAILED
        @Size(max = 1_000, message = "Ghi chú kiểm tra tối đa 1000 ký tự")
        String inspectionNote
) {
}
