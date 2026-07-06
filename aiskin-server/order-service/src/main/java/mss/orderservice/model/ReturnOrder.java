package mss.orderservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
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

    // Trạng thái phiếu trả hàng
    private ReturnStatus status;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ReturnStatus {
        PENDING,     // Chờ Admin duyệt
        APPROVED,    // Admin đã duyệt, chờ kho nhận hàng (Khách chưa gửi / GHN chưa lấy)
        READY_TO_PICK, // GHN: Chờ lấy hàng
        PICKING,     // GHN: Đang lấy hàng
        PICKED,      // GHN: Đã lấy hàng
        STORING,     // GHN: Nhập kho
        TRANSPORTING,// GHN đang trung chuyển kiện hàng hoàn
        SORTING,     // GHN: Đang phân loại
        DELIVERING,  // GHN đang giao kiện hàng hoàn cho kho SkinGuide
        DELIVERED,   // GHN đã giao thành công cho kho SkinGuide
        REJECTED,    // Admin từ chối trả hàng
        RECEIVED,    // Kho đã nhận được hàng trả về (Admin xác nhận thủ công)
        REFUNDED     // Đã hoàn tiền cho khách xong
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReturnItem {
        private String productId;
        private String productName;
        private String imageUrl;
        private Integer quantity; // Số lượng trả lại
        private String unit;
        private BigDecimal unitPrice;
        private BigDecimal subTotal; // quantity * unitPrice
    }
}
