// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.dto;

import mss.orderservice.model.Order;

public record PaymentProcessingResult(
        Order.PaymentStatus paymentStatus,
        boolean alreadyProcessed) {
}
