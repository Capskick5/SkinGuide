package mss.orderservice.dto;

import mss.orderservice.model.Order;

public record PaymentProcessingResult(
        Order.PaymentStatus paymentStatus,
        boolean alreadyProcessed) {
}
