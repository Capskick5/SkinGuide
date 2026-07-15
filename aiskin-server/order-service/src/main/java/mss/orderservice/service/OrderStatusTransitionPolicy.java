package mss.orderservice.service;

import mss.orderservice.model.Order;

import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

public final class OrderStatusTransitionPolicy {

    private static final Map<Order.OrderStatus, Integer> OUTBOUND_PROGRESS = progressMap(
            Order.OrderStatus.READY_TO_PICK,
            Order.OrderStatus.PICKING,
            Order.OrderStatus.PICKED,
            Order.OrderStatus.STORING,
            Order.OrderStatus.SORTING,
            Order.OrderStatus.TRANSPORTING,
            Order.OrderStatus.DELIVERING,
            Order.OrderStatus.DELIVERED);

    private static final Map<Order.OrderStatus, Integer> RETURN_PROGRESS = progressMap(
            Order.OrderStatus.WAITING_TO_RETURN,
            Order.OrderStatus.RETURN,
            Order.OrderStatus.RETURN_TRANSPORTING,
            Order.OrderStatus.RETURNING,
            Order.OrderStatus.RETURNED);

    private static final Set<Order.OrderStatus> TERMINAL = Set.of(
            Order.OrderStatus.DELIVERED,
            Order.OrderStatus.RETURNED,
            Order.OrderStatus.RECEIVED,
            Order.OrderStatus.REFUSED,
            Order.OrderStatus.CANCELLED);

    private OrderStatusTransitionPolicy() {
    }

    public static boolean isAdminTransitionAllowed(
            Order.OrderStatus current,
            Order.OrderStatus next) {
        if (current == next) {
            return true;
        }
        return switch (current) {
            case PENDING -> next == Order.OrderStatus.PROCESSING
                    || next == Order.OrderStatus.CANCELLED;
            case PROCESSING -> next == Order.OrderStatus.READY_TO_PICK;
            default -> false;
        };
    }

    public static boolean isCarrierTransitionAllowed(
            Order.OrderStatus current,
            Order.OrderStatus next) {
        if (current == next) {
            return true;
        }
        if (TERMINAL.contains(current)) {
            return false;
        }
        if (current == Order.OrderStatus.PROCESSING) {
            return OUTBOUND_PROGRESS.containsKey(next);
        }
        if (next == Order.OrderStatus.CANCELLED) {
            return OUTBOUND_PROGRESS.containsKey(current);
        }
        if (OUTBOUND_PROGRESS.containsKey(current) && OUTBOUND_PROGRESS.containsKey(next)) {
            return OUTBOUND_PROGRESS.get(next) > OUTBOUND_PROGRESS.get(current);
        }
        if (OUTBOUND_PROGRESS.containsKey(current)) {
            return next == Order.OrderStatus.DELIVERY_FAIL
                    || RETURN_PROGRESS.containsKey(next);
        }
        if (current == Order.OrderStatus.DELIVERY_FAIL
                || current == Order.OrderStatus.RETURN_FAIL) {
            return RETURN_PROGRESS.containsKey(next);
        }
        if (RETURN_PROGRESS.containsKey(current) && RETURN_PROGRESS.containsKey(next)) {
            return RETURN_PROGRESS.get(next) > RETURN_PROGRESS.get(current);
        }
        if (RETURN_PROGRESS.containsKey(current) && next == Order.OrderStatus.RETURN_FAIL) {
            return true;
        }
        return false;
    }

    private static Map<Order.OrderStatus, Integer> progressMap(Order.OrderStatus... statuses) {
        Map<Order.OrderStatus, Integer> progress = new EnumMap<>(Order.OrderStatus.class);
        for (int index = 0; index < statuses.length; index++) {
            progress.put(statuses[index], index);
        }
        return Map.copyOf(progress);
    }
}
