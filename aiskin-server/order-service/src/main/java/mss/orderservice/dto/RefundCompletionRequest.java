// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RefundCompletionRequest(
        @Size(max = 500, message = "Đường dẫn biên lai tối đa 500 ký tự")
        @Pattern(
                regexp = "^$|^https://[^\\s]+$|^/api/orders/uploads/[0-9a-fA-F-]{36}\\.(jpg|png)$",
                message = "Biên lai phải là URL HTTPS hoặc ảnh đã tải lên hệ thống")
        String receiptUrl
) {
}
