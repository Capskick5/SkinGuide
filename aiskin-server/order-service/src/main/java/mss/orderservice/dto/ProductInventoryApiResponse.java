package mss.orderservice.dto;

import lombok.Data;

@Data
public class ProductInventoryApiResponse {
    private Boolean success;
    private String message;
    private ProductInventoryResponse data;
}
