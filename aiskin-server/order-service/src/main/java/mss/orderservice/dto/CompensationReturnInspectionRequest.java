package mss.orderservice.dto;

import jakarta.validation.constraints.NotNull;
import mss.orderservice.model.ReturnOrder;

public record CompensationReturnInspectionRequest(
        @NotNull(message = "Cần chọn cách xử lý kho cho kiện giao lại đã hoàn về")
        ReturnOrder.InventoryDisposition inventoryDisposition
) {
}
