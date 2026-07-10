package mss.orderservice.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductInventoryResponse {
    private String orderCode;
    private BigDecimal totalAmount;
    private List<ProductInventoryItemResponse> items;
}
