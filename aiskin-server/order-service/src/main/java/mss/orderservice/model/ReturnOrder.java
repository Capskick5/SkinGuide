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

    // Số tiền hoàn trả (Thường bằng hoặc thấp hơn tổng tiền đơn hàng)
    private BigDecimal refundAmount;

    // Trạng thái phiếu trả hàng
    private ReturnStatus status;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ReturnStatus {
        PENDING,     // Chờ Admin duyệt
        APPROVED,    // Admin đã duyệt, chờ kho nhận hàng
        REJECTED,    // Admin từ chối trả hàng
        RECEIVED,    // Kho đã nhận được hàng trả về
        REFUNDED     // Đã hoàn tiền cho khách xong
    }
}
