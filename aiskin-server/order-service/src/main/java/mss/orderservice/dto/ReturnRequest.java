// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import mss.orderservice.model.ReturnOrder;

import java.util.List;

public record ReturnRequest(
        // Loại khiếu nại (null = RETURN để tương thích với các request cũ)
        ReturnOrder.ClaimType claimType,

        @NotBlank(message = "Lý do trả hàng là bắt buộc")
        @Size(max = 120, message = "Lý do trả hàng tối đa 120 ký tự")
        String reason,

        @NotBlank(message = "Mô tả trả hàng là bắt buộc")
        @Size(max = 1_000, message = "Mô tả trả hàng tối đa 1000 ký tự")
        String description,

        @NotEmpty(message = "Cần ít nhất một ảnh bằng chứng")
        @Size(max = 5, message = "Chỉ được đính kèm tối đa 5 ảnh")
        List<@Pattern(
                regexp = "^/api/orders/uploads/[0-9a-fA-F-]{36}\\.(jpg|png)$",
                message = "Đường dẫn ảnh bằng chứng không hợp lệ") String> imageUrls,

        @NotEmpty(message = "Cần chọn ít nhất một sản phẩm để trả/báo cáo")
        @Size(max = 20, message = "Một yêu cầu chỉ được xử lý tối đa 20 dòng sản phẩm")
        List<@Valid ReturnItemRequest> items
) {
}
