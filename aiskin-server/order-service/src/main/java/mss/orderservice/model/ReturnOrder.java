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

    private String orderId; // Ref to Order.id
    private String orderCode;

    // Khiếu nại phát sinh sau một đơn giao lại đã được GHN xác nhận giao thành công.
    // Mỗi đơn giao lại chỉ được tạo tối đa một khiếu nại tiếp theo.
    @Indexed(unique = true, sparse = true)
    private String sourceCompensationOrderId;
    private String parentReturnOrderId;

    @Builder.Default
    private Boolean followUpClaim = false;

    @Builder.Default
    private Boolean refundOnly = false;

    private String customerId;
    private String customerName;

    // Chi tiết đổi trả
    private String reason; // Lý do trả hàng (Hàng lỗi, Không đúng mô tả,...)
    private String description; // Mô tả chi tiết thêm của khách
    private List<String> imageUrls; // Bằng chứng hình ảnh/video
    private String rejectReason; // Lý do từ chối (bởi Admin)

    // Danh sách sản phẩm trả lại
    private List<ReturnItem> items;

    // Chỉ dùng cho WRONG_ITEM: hàng khách thực tế nhận nhầm và gửi trả về kho.
    private List<WrongItem> wrongItems;

    // Số tiền hoàn trả (Thường bằng hoặc thấp hơn tổng tiền đơn hàng)
    private BigDecimal refundAmount;

    // Chi phí vận chuyển hoàn trả (Shop chịu)
    private BigDecimal returnShippingFee;

    // Thông tin vận chuyển khi trả hàng (do khách cung cấp)
    private String returnCourier; // Đơn vị vận chuyển (VD: GHN, Viettel Post)
    private String returnTrackingCode; // Mã vận đơn trả hàng
    private LocalDateTime returnShipmentCreatedAt; // Mốc ghi nhận chi phí thu hồi hàng
    private String returnShipmentError; // Lỗi tạo vận đơn gần nhất, để admin biết cần xử lý thủ công
    private String redeliveryTrackingCode;
    private BigDecimal redeliveryShippingFee;

    // Loại khiếu nại - phân biệt nghiệp vụ từ đầu
    private ClaimType claimType;

    // Trạng thái phiếu trả hàng
    private ReturnStatus status;

    private InventoryDisposition inventoryDisposition;

    // Hướng xử lý cuối cùng do Admin quyết định (hoàn tiền hoặc giao lại)
    private ResolutionType resolution;

    // Ghi chú kiểm tra khi Admin phát hiện hàng trả về không đúng
    private String inspectionNote;

    // Dấu vết bắt buộc trước khi Admin/Manager duyệt hoặc từ chối khiếu nại.
    private String reviewedBy;
    private String reviewedByDisplay;
    private LocalDateTime reviewedAt;

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
        INSPECTING,         // Kho đang kiểm tra đúng sản phẩm và tình trạng thực tế
        REJECTED,           // Admin từ chối trả hàng (trước khi nhận hàng)
        RECEIVED,           // Kho đã nhận và kiểm tra hàng OK (Admin xác nhận)
        INSPECTION_FAILED,  // Hàng trả về không đúng/tráo hàng - từ chối sau kiểm tra
        REFUND_PENDING,     // Đã duyệt, chờ khách cung cấp tài khoản nhận tiền
        REFUND_PROCESSING,  // Khách đã cung cấp tài khoản, chờ Admin chuyển khoản
        REFUNDED,           // Đã hoàn tiền cho khách xong
        REDELIVERY_PENDING, // Chờ kho xuất hàng giao lại
        REDELIVERING,       // Đang giao sản phẩm đúng/thay thế
        RESOLVED            // Đã giao lại thành công
    }

    public enum InventoryDisposition {
        RESTOCK,   // Nhập lại kho hàng có thể bán
        DAMAGED,   // Nhập vào kho hàng hỏng
        DISCARD    // Tiêu hủy - không nhập lại bất kỳ kho nào
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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WrongItem {
        private String productId;
        private String variantId;
        private String sku;
        private String productName;
        private String variantName;
        private Integer quantity;
    }
}
