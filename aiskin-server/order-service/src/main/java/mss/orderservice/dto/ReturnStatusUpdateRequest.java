// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import mss.orderservice.model.ReturnOrder;

import java.util.List;

public record ReturnStatusUpdateRequest(
        @NotNull(message = "Trạng thái là bắt buộc")
        ReturnOrder.ReturnStatus status,

        @Size(max = 500, message = "Lý do từ chối tối đa 500 ký tự")
        String rejectReason,

        ReturnOrder.InventoryDisposition inventoryDisposition,

        // Ghi chú kiểm tra thực tế - bắt buộc khi chuyển sang INSPECTION_FAILED
        @Size(max = 1_000, message = "Ghi chú kiểm tra tối đa 1000 ký tự")
        String inspectionNote,

        // Chỉ nhân viên kho khai báo khi kiểm hàng giao sai và xác nhận nhập kho.
        @Size(max = 20, message = "Chỉ được xác nhận tối đa 20 dòng sản phẩm giao sai")
        List<@Valid WrongItemRequest> wrongItems
) {
}
