// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service;

import mss.orderservice.dto.ReturnRequest;
import mss.orderservice.dto.WrongItemRequest;
import mss.orderservice.model.ReturnOrder;
import org.springframework.data.domain.Page;

import java.util.List;

public interface IReturnOrderService {

    ReturnOrder createReturnRequest(String orderId, ReturnRequest request);

    List<ReturnOrder> getReturnsByCustomer(String customerId);

    Page<ReturnOrder> getAllReturns(int page, int size, String status);

    ReturnOrder getReturnByOrderId(String orderId);

    ReturnOrder reviewReturn(String id, String reviewerId);

    ReturnOrder updateReturnStatus(String id, ReturnOrder.ReturnStatus newStatus, String rejectReason, ReturnOrder.InventoryDisposition inventoryDisposition);

    ReturnOrder updateReturnStatus(String id, ReturnOrder.ReturnStatus newStatus, String rejectReason, ReturnOrder.InventoryDisposition inventoryDisposition, String inspectionNote);

    ReturnOrder updateReturnStatus(String id, ReturnOrder.ReturnStatus newStatus, String rejectReason,
                                   ReturnOrder.InventoryDisposition inventoryDisposition, String inspectionNote,
                                   List<WrongItemRequest> inspectedWrongItems);

    ReturnOrder updateReturnStatus(String id, ReturnOrder.ReturnStatus newStatus, String rejectReason,
                                   ReturnOrder.InventoryDisposition inventoryDisposition, String inspectionNote,
                                   List<WrongItemRequest> inspectedWrongItems, String actorId);

    ReturnOrder resolveReturn(String id, ReturnOrder.ResolutionType resolutionType, String note);

    ReturnOrder resolveReturn(String id, ReturnOrder.ResolutionType resolutionType, String note, String actorId);

    ReturnOrder updateReturnRequest(String id, ReturnRequest request);

    void deleteReturnRequest(String id);

    ReturnOrder updateReturnTracking(String id, String courier, String trackingCode);

    void syncGhnReturnOrderStatus();
}
