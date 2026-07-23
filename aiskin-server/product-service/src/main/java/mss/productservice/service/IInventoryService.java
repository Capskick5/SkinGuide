// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.InventoryAdjustmentRequest;
import mss.productservice.dto.request.InventoryReservationItemRequest;
import mss.productservice.dto.request.InventoryReservationRequest;
import mss.productservice.dto.request.InventoryReturnRequest;
import mss.productservice.dto.response.InventoryMovementResponse;
import mss.productservice.dto.response.InventoryReservationItemResponse;
import mss.productservice.dto.response.InventoryReservationResponse;
import mss.productservice.exception.ResourceNotFoundException;
import mss.productservice.model.InventoryLevel;
import mss.productservice.model.InventoryMovement;
import mss.productservice.model.Product;
import mss.productservice.model.ProductVariant;
import mss.productservice.repository.InventoryMovementRepository;
import mss.productservice.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Collectors;

public interface IInventoryService {

    InventoryReservationResponse reserve(InventoryReservationRequest request);

    InventoryReservationResponse release(InventoryReservationRequest request);

    InventoryReservationResponse commit(InventoryReservationRequest request);

    InventoryReservationResponse processReturn(InventoryReturnRequest request);

    InventoryReservationResponse processReservedReturn(InventoryReturnRequest request);

    InventoryMovementResponse adjust(InventoryAdjustmentRequest request);

    Page<InventoryMovementResponse> getMovements(String productId, String variantId, int page, int size);
}
