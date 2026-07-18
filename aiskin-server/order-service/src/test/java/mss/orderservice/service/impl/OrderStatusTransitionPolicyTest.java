package mss.orderservice.service.impl;
import mss.orderservice.service.*;


import mss.orderservice.model.Order;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrderStatusTransitionPolicyTest {

    @Test
    void adminCanOnlyPrepareOrCancelPendingOrdersAndCreateShipment() {
        assertThat(OrderStatusTransitionPolicy.isAdminTransitionAllowed(
                Order.OrderStatus.PENDING, Order.OrderStatus.PROCESSING)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isAdminTransitionAllowed(
                Order.OrderStatus.PENDING, Order.OrderStatus.CANCELLED)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isAdminTransitionAllowed(
                Order.OrderStatus.PROCESSING, Order.OrderStatus.READY_TO_PICK)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isAdminTransitionAllowed(
                Order.OrderStatus.READY_TO_PICK, Order.OrderStatus.DELIVERED)).isFalse();
        assertThat(OrderStatusTransitionPolicy.isAdminTransitionAllowed(
                Order.OrderStatus.DELIVERED, Order.OrderStatus.PROCESSING)).isFalse();
    }

    @Test
    void carrierCanSkipForwardButCannotRegressOrChangeTerminalOrder() {
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.READY_TO_PICK, Order.OrderStatus.TRANSPORTING)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.TRANSPORTING, Order.OrderStatus.PICKING)).isFalse();
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.DELIVERED, Order.OrderStatus.DELIVERING)).isFalse();
    }

    @Test
    void carrierSupportsFailureAndReturnProgression() {
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.DELIVERING, Order.OrderStatus.DELIVERY_FAIL)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.DELIVERY_FAIL, Order.OrderStatus.RETURN_TRANSPORTING)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.RETURNING, Order.OrderStatus.RETURNED)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.RETURNING, Order.OrderStatus.RETURN_FAIL)).isTrue();
        assertThat(OrderStatusTransitionPolicy.isCarrierTransitionAllowed(
                Order.OrderStatus.RETURNED, Order.OrderStatus.RETURNING)).isFalse();
    }
}


