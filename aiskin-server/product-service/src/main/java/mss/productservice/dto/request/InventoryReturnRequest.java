// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryReturnRequest {

    @NotBlank(message = "Return order id is required")
    private String returnOrderId;

    @NotBlank(message = "Order code is required")
    private String orderCode;

    @NotNull(message = "Return disposition is required")
    private Disposition disposition;

    @Valid
    @NotEmpty(message = "Return must include at least one item")
    private List<InventoryReservationItemRequest> items;

    /**
     * Chỉ dùng cho giao sai hàng: các sản phẩm hệ thống đã ghi nhận bán theo
     * đơn gốc nhưng thực tế chưa rời kho.
     */
    @Valid
    private List<InventoryReservationItemRequest> expectedItems;

    public enum Disposition {
        RESTOCK,
        DAMAGED,
        DISCARD
    }
}
