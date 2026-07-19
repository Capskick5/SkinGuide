// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryReservationRequest {

    @NotBlank(message = "Order code is required")
    private String orderCode;

    @Valid
    @NotEmpty(message = "Inventory request must include at least one item")
    private List<InventoryReservationItemRequest> items;
}
