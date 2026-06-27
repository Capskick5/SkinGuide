package mss.orderservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderResponse {
    private String orderCode;
    private String status;
    private String paymentUrl; // Contains Momo URL or just "" for COD
}
