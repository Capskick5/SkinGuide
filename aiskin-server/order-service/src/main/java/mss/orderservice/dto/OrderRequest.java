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
    
    private List<OrderItemRequest> items;
    private PaymentMethod paymentMethod;
}
