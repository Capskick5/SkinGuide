// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "return_orders")
public class ReturnOrder {

    @Id
    private String id;

    @Indexed(unique = true)
    private String orderId; // Ref to Order.id
    private String orderCode;

    private String customerId;
    private String customerName;

    // Chi tiết đổi trả
    private String reason; // Lý do trả hàng (Hàng lỗi, Không đúng mô tả,...)
    private String description; // Mô tả chi tiết thêm của khách
    private List<String> imageUrls; // Bằng chứng hình ảnh/video
    private String rejectReason; // Lý do từ chối (bởi Admin)

    // Danh sách sản phẩm trả lại
    private List<ReturnItem> items;

    // Số tiền hoàn trả (Thường bằng hoặc thấp hơn tổng tiền đơn hàng)
    private BigDecimal refundAmount;

    // Chi phí vận chuyển hoàn trả (Shop chịu)
    private BigDecimal returnShippingFee;

    // Thông tin vận chuyển khi trả hàng (do khách cung cấp)
    private String returnCourier; // Đơn vị vận chuyển (VD: GHN, Viettel Post)
    private String returnTrackingCode; // Mã vận đơn trả hàng
    private String returnShipmentError; // Lỗi tạo vận đơn gần nhất, để admin biết cần xử lý thủ công

    // Loại khiếu nại - phân biệt nghiệp vụ từ đầu
    private ClaimType claimType;

    // Trạng thái phiếu trả hàng
    private ReturnStatus status;

    private InventoryDisposition inventoryDisposition;

    // Hướng xử lý cuối cùng do Admin quyết định (hoàn tiền hoặc giao lại)
    private ResolutionType resolution;

    // Ghi chú kiểm tra khi Admin phát hiện hàng trả về không đúng
    private String inspectionNote;

    @Builder.Default
    private Boolean inventoryProcessed = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ClaimType {
        RETURN,         // Trả hàng thông thường (hàng lỗi, đổi ý,...)
        MISSING_ITEM,   // Giao thiếu hàng (khách không có hàng để trả về)
        WRONG_ITEM      // Giao sai hàng (khách nhận được hàng không đúng)
    }

    public enum ReturnStatus {
        PENDING,            // Chờ Admin duyệt
        DELIVERING,         // GHN đang trung chuyển/giao kiện hàng hoàn
        DELIVERED,          // GHN đã giao thành công cho kho SkinGuide
        REJECTED,           // Admin từ chối trả hàng (trước khi nhận hàng)
        RECEIVED,           // Kho đã nhận và kiểm tra hàng OK (Admin xác nhận)
        INSPECTION_FAILED,  // Hàng trả về không đúng/tráo hàng - từ chối sau kiểm tra
        REFUNDED            // Đã hoàn tiền cho khách xong
    }

    public enum InventoryDisposition {
        RESTOCK,   // Nhập lại kho hàng có thể bán
        DAMAGED,   // Nhập vào kho hàng hỏng
        DISCARD    // Hủy bỏ - không tác động kho (hàng không phải của shop)
    }

    public enum ResolutionType {
        REFUND,     // Hoàn tiền cho khách
        REDELIVER   // Giao lại hàng đúng/đủ cho khách
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReturnItem {
        private String productId;
        private String variantId;
        private String sku;
        private String variantName;
        private String productName;
        private String imageUrl;
        private Integer quantity; // Số lượng trả lại
        private String unit;
        private BigDecimal unitPrice;
        private BigDecimal subTotal; // quantity * unitPrice
    }
}
