package mss.productservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventorySummaryResponse {
    private long totalOnHand;
    private long totalReserved;
    private long totalAvailable;
    private long productCount;
    private long lowStockCount;
    private long outOfStockCount;
}
