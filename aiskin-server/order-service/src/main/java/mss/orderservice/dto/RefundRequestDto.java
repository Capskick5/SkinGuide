package mss.orderservice.dto;

import lombok.Data;

@Data
public class RefundRequestDto {
    private String returnOrderId;
    private String customerId;
    private String bankName;
    private String accountNumber;
    private String accountName;
}
