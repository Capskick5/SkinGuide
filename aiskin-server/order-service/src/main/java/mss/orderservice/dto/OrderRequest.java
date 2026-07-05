package mss.orderservice.dto;

import lombok.Data;
import mss.orderservice.model.Order.PaymentMethod;

import java.util.List;

@Data
public class OrderRequest {
    private String customerId; // Optional if guest
    private String customerName;
    private String customerPhone;
    private String shippingAddress;
    
    private Integer ghnDistrictId;
    private String ghnWardCode;
    private java.math.BigDecimal shippingFee;
    
    private List<OrderItemRequest> items;
    private PaymentMethod paymentMethod;
}
