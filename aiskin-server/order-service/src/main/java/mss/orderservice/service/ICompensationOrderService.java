package mss.orderservice.service;

import mss.orderservice.model.CompensationOrder;

import java.util.List;

public interface ICompensationOrderService {
    List<CompensationOrder> getAll(String status);
    CompensationOrder getByReturnOrderId(String returnOrderId);
    CompensationOrder reserveInventory(String id);
    CompensationOrder createShipment(String id);
    CompensationOrder complete(String id);
    CompensationOrder cancel(String id);
}
