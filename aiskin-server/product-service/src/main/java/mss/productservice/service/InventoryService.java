package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.InventoryAdjustmentRequest;
import mss.productservice.dto.request.InventoryReservationItemRequest;
import mss.productservice.dto.request.InventoryReservationRequest;
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

@Service
@RequiredArgsConstructor
public class InventoryService {

    public static final String DEFAULT_WAREHOUSE_ID = "MAIN_WAREHOUSE";
    public static final String DEFAULT_WAREHOUSE_NAME = "Kho chính";

    private final ProductRepository productRepository;
    private final InventoryMovementRepository movementRepository;
    private final KafkaProductProducer kafkaProductProducer;

    @Transactional
    public synchronized InventoryReservationResponse reserve(InventoryReservationRequest request) {
        List<InventoryContext> contexts = buildContexts(request, true);
        InventoryReservationResponse repeatedResponse = repeatedOperationResponse(
                request,
                contexts,
                InventoryMovement.MovementType.RESERVE);
        if (repeatedResponse != null) {
            return repeatedResponse;
        }
        rejectIfApplied(request, InventoryMovement.MovementType.RELEASE,
                "Đơn hàng đã release tồn kho nên không thể reserve lại");
        rejectIfApplied(request, InventoryMovement.MovementType.COMMIT_SALE,
                "Đơn hàng đã chốt bán nên không thể reserve lại");

        Map<String, Integer> requestedByVariant = contexts.stream()
                .collect(Collectors.groupingBy(this::contextKey, Collectors.summingInt(InventoryContext::quantity)));

        for (InventoryContext context : contexts) {
            int available = available(context.level());
            int requested = requestedByVariant.get(contextKey(context));
            if (available < requested) {
                throw new IllegalArgumentException("Sản phẩm " + context.product().getName()
                        + " - " + context.variant().getName()
                        + " chỉ còn " + available + " sản phẩm có thể bán.");
            }
        }

        return mutateOrderInventory(
                request,
                contexts,
                InventoryMovement.MovementType.RESERVE,
                "Reserve stock for order",
                context -> context.level().setReservedQuantity(value(context.level().getReservedQuantity()) + context.quantity())
        );
    }

    @Transactional
    public synchronized InventoryReservationResponse release(InventoryReservationRequest request) {
        List<InventoryContext> contexts = buildContexts(request, false);
        InventoryReservationResponse repeatedResponse = repeatedOperationResponse(
                request,
                contexts,
                InventoryMovement.MovementType.RELEASE);
        if (repeatedResponse != null) {
            return repeatedResponse;
        }
        requireApplied(request, InventoryMovement.MovementType.RESERVE,
                "Đơn hàng chưa reserve tồn kho nên không thể release");
        rejectIfApplied(request, InventoryMovement.MovementType.COMMIT_SALE,
                "Đơn hàng đã chốt bán nên không thể release");

        for (InventoryContext context : contexts) {
            if (value(context.level().getReservedQuantity()) < context.quantity()) {
                throw new IllegalArgumentException("Không đủ reserved stock để release SKU " + context.variant().getSku());
            }
        }

        return mutateOrderInventory(
                request,
                contexts,
                InventoryMovement.MovementType.RELEASE,
                "Release reserved stock",
                context -> context.level().setReservedQuantity(value(context.level().getReservedQuantity()) - context.quantity())
        );
    }

    @Transactional
    public synchronized InventoryReservationResponse commit(InventoryReservationRequest request) {
        List<InventoryContext> contexts = buildContexts(request, false);
        InventoryReservationResponse repeatedResponse = repeatedOperationResponse(
                request,
                contexts,
                InventoryMovement.MovementType.COMMIT_SALE);
        if (repeatedResponse != null) {
            return repeatedResponse;
        }
        requireApplied(request, InventoryMovement.MovementType.RESERVE,
                "Đơn hàng chưa reserve tồn kho nên không thể chốt bán");
        rejectIfApplied(request, InventoryMovement.MovementType.RELEASE,
                "Đơn hàng đã release tồn kho nên không thể chốt bán");

        for (InventoryContext context : contexts) {
            if (value(context.level().getReservedQuantity()) < context.quantity()) {
                throw new IllegalArgumentException("Không đủ reserved stock để chốt bán SKU " + context.variant().getSku());
            }
            if (value(context.level().getOnHandQuantity()) < context.quantity()) {
                throw new IllegalArgumentException("Không đủ tồn kho vật lý để chốt bán SKU " + context.variant().getSku());
            }
        }

        return mutateOrderInventory(
                request,
                contexts,
                InventoryMovement.MovementType.COMMIT_SALE,
                "Commit reserved stock as sold",
                context -> {
                    InventoryLevel level = context.level();
                    level.setReservedQuantity(value(level.getReservedQuantity()) - context.quantity());
                    level.setOnHandQuantity(value(level.getOnHandQuantity()) - context.quantity());
                    level.setSoldQuantity(value(level.getSoldQuantity()) + context.quantity());
                }
        );
    }

    @Transactional
    public synchronized InventoryMovementResponse adjust(InventoryAdjustmentRequest request) {
        InventoryAdjustmentRequest.OperationType operationType = request.getOperationType() == null
                ? InventoryAdjustmentRequest.OperationType.ADJUSTMENT
                : request.getOperationType();

        Product product = findProduct(request.getProductId());
        ProductVariant variant = findVariant(product, request.getVariantId());
        InventoryLevel level = findLevel(variant, warehouseId(request.getWarehouseId()));
        InventorySnapshot before = snapshot(level);
        int quantityDelta = resolveQuantityDelta(request, operationType, before);
        validateAdjustmentDirection(operationType, quantityDelta);
        int adjustedOnHand = before.onHand() + quantityDelta;

        if (adjustedOnHand < 0) {
            throw new IllegalArgumentException("Tồn kho sau điều chỉnh không được âm");
        }
        if (adjustedOnHand < before.reserved()) {
            throw new IllegalArgumentException("Tồn kho sau điều chỉnh không được thấp hơn số lượng đang giữ");
        }

        level.setOnHandQuantity(adjustedOnHand);
        Product saved = productRepository.save(product);
        publishProductsAfterCommit(List.of(saved));

        InventoryMovement movement = movementRepository.save(buildMovement(
                new InventoryContext(product, variant, level, Math.abs(quantityDelta)),
                before,
                movementType(operationType),
                referenceType(operationType),
                UUID.randomUUID().toString(),
                request.getReason(),
                quantityDelta
        ));
        return toMovementResponse(movement);
    }

    private int resolveQuantityDelta(
            InventoryAdjustmentRequest request,
            InventoryAdjustmentRequest.OperationType operationType,
            InventorySnapshot before) {
        int quantityDelta;
        if (operationType == InventoryAdjustmentRequest.OperationType.COUNT && request.getTargetQuantity() != null) {
            if (request.getTargetQuantity() < 0) {
                throw new IllegalArgumentException("Tồn thực tế sau kiểm kê không được âm");
            }
            quantityDelta = request.getTargetQuantity() - before.onHand();
        } else {
            quantityDelta = request.getQuantityDelta() == null ? 0 : request.getQuantityDelta();
        }
        if (quantityDelta == 0) {
            throw new IllegalArgumentException("Tồn kho không thay đổi");
        }
        return quantityDelta;
    }

    private void validateAdjustmentDirection(
            InventoryAdjustmentRequest.OperationType operationType,
            int quantityDelta) {
        if (operationType == InventoryAdjustmentRequest.OperationType.RECEIPT && quantityDelta < 0) {
            throw new IllegalArgumentException("Số lượng nhập kho phải lớn hơn 0");
        }
        if (operationType == InventoryAdjustmentRequest.OperationType.WRITE_OFF && quantityDelta > 0) {
            throw new IllegalArgumentException("Số lượng xuất hủy phải làm giảm tồn kho");
        }
    }

    private InventoryMovement.MovementType movementType(InventoryAdjustmentRequest.OperationType operationType) {
        return switch (operationType) {
            case RECEIPT -> InventoryMovement.MovementType.STOCK_RECEIPT;
            case COUNT -> InventoryMovement.MovementType.STOCK_COUNT;
            case WRITE_OFF -> InventoryMovement.MovementType.STOCK_WRITE_OFF;
            case ADJUSTMENT -> InventoryMovement.MovementType.ADJUSTMENT;
        };
    }

    private String referenceType(InventoryAdjustmentRequest.OperationType operationType) {
        return switch (operationType) {
            case RECEIPT -> "STOCK_RECEIPT";
            case COUNT -> "STOCK_COUNT";
            case WRITE_OFF -> "STOCK_WRITE_OFF";
            case ADJUSTMENT -> "ADMIN_ADJUSTMENT";
        };
    }

    public Page<InventoryMovementResponse> getMovements(String productId, String variantId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<InventoryMovement> movements;
        if (hasText(productId) && hasText(variantId)) {
            movements = movementRepository.findByProductIdAndVariantIdOrderByCreatedAtDesc(productId, variantId, pageable);
        } else if (hasText(productId)) {
            movements = movementRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable);
        } else {
            movements = movementRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return movements.map(this::toMovementResponse);
    }

    private InventoryReservationResponse mutateOrderInventory(
            InventoryReservationRequest request,
            List<InventoryContext> contexts,
            InventoryMovement.MovementType type,
            String reason,
            Consumer<InventoryContext> mutation) {
        List<PendingMovement> pendingMovements = new ArrayList<>();
        for (InventoryContext context : contexts) {
            InventorySnapshot before = snapshot(context.level());
            mutation.accept(context);
            pendingMovements.add(new PendingMovement(context, before));
        }

        saveProducts(contexts);
        List<InventoryMovement> movements = pendingMovements.stream()
                .map(pending -> buildMovement(
                        pending.context(),
                        pending.before(),
                        type,
                        "ORDER",
                        request.getOrderCode(),
                        reason,
                        pending.context().quantity()
                ))
                .toList();
        movementRepository.saveAll(movements);
        return toReservationResponse(request.getOrderCode(), contexts);
    }

    private InventoryReservationResponse repeatedOperationResponse(
            InventoryReservationRequest request,
            List<InventoryContext> contexts,
            InventoryMovement.MovementType type) {
        List<InventoryMovement> existing = getOperationMovements(request, type);
        if (existing.isEmpty()) {
            return null;
        }

        Map<String, Integer> requested = contexts.stream()
                .collect(Collectors.groupingBy(this::contextKey, Collectors.summingInt(InventoryContext::quantity)));
        Map<String, Integer> recorded = existing.stream()
                .collect(Collectors.groupingBy(this::movementKey,
                        Collectors.summingInt(movement -> value(movement.getQuantity()))));
        if (!requested.equals(recorded)) {
            throw new IllegalArgumentException("Retry inventory không khớp SKU hoặc số lượng của lần xử lý đầu tiên");
        }
        return toReservationResponse(request.getOrderCode(), contexts);
    }

    private void requireApplied(
            InventoryReservationRequest request,
            InventoryMovement.MovementType type,
            String message) {
        if (getOperationMovements(request, type).isEmpty()) {
            throw new IllegalArgumentException(message);
        }
    }

    private void rejectIfApplied(
            InventoryReservationRequest request,
            InventoryMovement.MovementType type,
            String message) {
        if (!getOperationMovements(request, type).isEmpty()) {
            throw new IllegalArgumentException(message);
        }
    }

    private List<InventoryMovement> getOperationMovements(
            InventoryReservationRequest request,
            InventoryMovement.MovementType type) {
        return movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER",
                request.getOrderCode(),
                type);
    }

    private List<InventoryContext> buildContexts(InventoryReservationRequest request, boolean requireTracking) {
        if (request == null || !hasText(request.getOrderCode())) {
            throw new IllegalArgumentException("Order code is required");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Inventory request must include at least one item");
        }

        List<InventoryContext> contexts = new ArrayList<>();
        for (InventoryReservationItemRequest item : request.getItems()) {
            if (!hasText(item.getProductId())) {
                throw new IllegalArgumentException("Product id is required for inventory item");
            }
            int quantity = value(item.getQuantity());
            if (quantity <= 0) {
                throw new IllegalArgumentException("Quantity must be greater than zero");
            }

            Product product = findProduct(item.getProductId());
            ProductVariant variant = resolveOrderVariant(product, item.getVariantId());
            if (Boolean.FALSE.equals(variant.getIsActive())) {
                throw new IllegalArgumentException("Variant " + variant.getSku() + " is inactive");
            }
            if (requireTracking && !Boolean.TRUE.equals(variant.getTrackInventory())) {
                throw new IllegalArgumentException("Variant " + variant.getSku() + " is not configured for stock tracking");
            }
            contexts.add(new InventoryContext(product, variant, findLevel(variant, DEFAULT_WAREHOUSE_ID), quantity));
        }
        return contexts;
    }

    private Product findProduct(String productId) {
        return productRepository.findByFlexibleId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
    }

    private ProductVariant resolveOrderVariant(Product product, String variantId) {
        ensureLegacyVariant(product);
        if (hasText(variantId)) {
            return findVariant(product, variantId);
        }
        return product.getVariants().stream()
                .filter(variant -> Boolean.TRUE.equals(variant.getIsActive()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Sản phẩm " + product.getName() + " không có variant active để bán."));
    }

    private ProductVariant findVariant(Product product, String variantId) {
        ensureLegacyVariant(product);
        return product.getVariants().stream()
                .filter(variant -> variantId.equals(variant.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy variant " + variantId + " của sản phẩm " + product.getName()));
    }

    private void ensureLegacyVariant(Product product) {
        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            return;
        }
        String slug = hasText(product.getSlug()) ? product.getSlug() : product.getId();
        ProductVariant variant = ProductVariant.builder()
                .id("legacy-default")
                .name("Default")
                .sku((slug + "-default").toUpperCase())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .isActive(Boolean.TRUE.equals(product.getIsActive()))
                .trackInventory(true)
                .lowStockThreshold(5)
                .inventoryLevels(new ArrayList<>())
                .build();
        product.setVariants(new ArrayList<>(List.of(variant)));
    }

    private InventoryLevel findLevel(ProductVariant variant, String warehouseId) {
        if (variant.getInventoryLevels() == null) {
            variant.setInventoryLevels(new ArrayList<>());
        }
        return variant.getInventoryLevels().stream()
                .filter(level -> warehouseId.equals(level.getWarehouseId()))
                .findFirst()
                .orElseGet(() -> {
                    InventoryLevel level = InventoryLevel.builder()
                            .warehouseId(warehouseId)
                            .warehouseName(DEFAULT_WAREHOUSE_ID.equals(warehouseId) ? DEFAULT_WAREHOUSE_NAME : warehouseId)
                            .onHandQuantity(0)
                            .reservedQuantity(0)
                            .soldQuantity(0)
                            .build();
                    variant.getInventoryLevels().add(level);
                    return level;
                });
    }

    private void saveProducts(List<InventoryContext> contexts) {
        Map<String, Product> uniqueProducts = new LinkedHashMap<>();
        contexts.forEach(context -> uniqueProducts.put(context.product().getId(), context.product()));
        List<Product> saved = productRepository.saveAll(uniqueProducts.values());
        publishProductsAfterCommit(saved);
    }

    private void publishProductsAfterCommit(List<Product> products) {
        Runnable publish = () -> products.forEach(kafkaProductProducer::sendProduct);
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            publish.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publish.run();
            }
        });
    }

    private InventoryReservationResponse toReservationResponse(String orderCode, List<InventoryContext> contexts) {
        List<InventoryReservationItemResponse> items = contexts.stream()
                .map(this::toReservationItemResponse)
                .toList();
        BigDecimal total = items.stream()
                .map(InventoryReservationItemResponse::getSubTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return InventoryReservationResponse.builder()
                .orderCode(orderCode)
                .totalAmount(total)
                .items(items)
                .build();
    }

    private InventoryReservationItemResponse toReservationItemResponse(InventoryContext context) {
        double price = context.variant().getPrice() != null
                ? context.variant().getPrice()
                : context.product().getPrice() != null ? context.product().getPrice() : 0;
        BigDecimal unitPrice = BigDecimal.valueOf(price);
        return InventoryReservationItemResponse.builder()
                .productId(context.product().getId())
                .productName(context.product().getName())
                .variantId(context.variant().getId())
                .variantName(context.variant().getName())
                .sku(context.variant().getSku())
                .imageUrl(hasText(context.variant().getImageUrl()) ? context.variant().getImageUrl() : context.product().getImageUrl())
                .unit(hasText(context.variant().getUnit()) ? context.variant().getUnit() : "Cái")
                .quantity(context.quantity())
                .unitPrice(unitPrice)
                .subTotal(unitPrice.multiply(BigDecimal.valueOf(context.quantity())))
                .build();
    }

    private InventoryMovement buildMovement(
            InventoryContext context,
            InventorySnapshot before,
            InventoryMovement.MovementType type,
            String referenceType,
            String referenceId,
            String reason,
            int movementQuantity) {
        return InventoryMovement.builder()
                .productId(context.product().getId())
                .productName(context.product().getName())
                .variantId(context.variant().getId())
                .variantName(context.variant().getName())
                .sku(context.variant().getSku())
                .warehouseId(context.level().getWarehouseId())
                .warehouseName(context.level().getWarehouseName())
                .type(type)
                .quantity(movementQuantity)
                .onHandBefore(before.onHand())
                .onHandAfter(value(context.level().getOnHandQuantity()))
                .reservedBefore(before.reserved())
                .reservedAfter(value(context.level().getReservedQuantity()))
                .soldBefore(before.sold())
                .soldAfter(value(context.level().getSoldQuantity()))
                .referenceType(referenceType)
                .referenceId(referenceId)
                .reason(reason)
                .build();
    }

    private InventoryMovementResponse toMovementResponse(InventoryMovement movement) {
        return InventoryMovementResponse.builder()
                .id(movement.getId())
                .productId(movement.getProductId())
                .productName(movement.getProductName())
                .variantId(movement.getVariantId())
                .variantName(movement.getVariantName())
                .sku(movement.getSku())
                .warehouseId(movement.getWarehouseId())
                .warehouseName(movement.getWarehouseName())
                .type(movement.getType() != null ? movement.getType().name() : null)
                .quantity(movement.getQuantity())
                .onHandBefore(movement.getOnHandBefore())
                .onHandAfter(movement.getOnHandAfter())
                .reservedBefore(movement.getReservedBefore())
                .reservedAfter(movement.getReservedAfter())
                .soldBefore(movement.getSoldBefore())
                .soldAfter(movement.getSoldAfter())
                .referenceType(movement.getReferenceType())
                .referenceId(movement.getReferenceId())
                .reason(movement.getReason())
                .createdAt(movement.getCreatedAt())
                .build();
    }

    private InventorySnapshot snapshot(InventoryLevel level) {
        return new InventorySnapshot(
                value(level.getOnHandQuantity()),
                value(level.getReservedQuantity()),
                value(level.getSoldQuantity())
        );
    }

    private int available(InventoryLevel level) {
        return Math.max(0, value(level.getOnHandQuantity()) - value(level.getReservedQuantity()));
    }

    private int value(Integer number) {
        return number == null ? 0 : Math.max(0, number);
    }

    private String warehouseId(String requested) {
        return hasText(requested) ? requested.trim() : DEFAULT_WAREHOUSE_ID;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String contextKey(InventoryContext context) {
        return context.product().getId() + ":" + context.variant().getId() + ":" + context.level().getWarehouseId();
    }

    private String movementKey(InventoryMovement movement) {
        return movement.getProductId() + ":" + movement.getVariantId() + ":" + movement.getWarehouseId();
    }

    private record InventoryContext(Product product, ProductVariant variant, InventoryLevel level, int quantity) {}

    private record InventorySnapshot(int onHand, int reserved, int sold) {}

    private record PendingMovement(InventoryContext context, InventorySnapshot before) {}
}
