package mss.orderservice.service;

import mss.orderservice.model.CompensationOrder;

import java.util.List;

public interface ICompensationOrderService {
    List<CompensationOrder> getAll(String status);
    CompensationOrder getById(String id);
    CompensationOrder getByReturnOrderId(String returnOrderId);
    CompensationOrder reserveInventory(String id);
    CompensationOrder createShipment(String id);
    void syncGhnCompensationOrderStatus();
    CompensationOrder applyGhnStatus(String id, String ghnStatus, String reason, String reasonCode);
    CompensationOrder complete(String id);
    CompensationOrder inspectReturnedInventory(String id,
                                                mss.orderservice.model.ReturnOrder.InventoryDisposition disposition);
    CompensationOrder cancel(String id);
}
