package mss.productservice.service;

import mss.productservice.dto.request.InventoryReservationItemRequest;
import mss.productservice.dto.request.InventoryReservationRequest;
import mss.productservice.dto.request.InventoryAdjustmentRequest;
import mss.productservice.dto.request.InventoryReturnRequest;
import mss.productservice.model.InventoryLevel;
import mss.productservice.model.InventoryMovement;
import mss.productservice.model.Product;
import mss.productservice.model.ProductVariant;
import mss.productservice.repository.InventoryMovementRepository;
import mss.productservice.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private InventoryMovementRepository movementRepository;

    @Mock
    private KafkaProductProducer kafkaProductProducer;

    private InventoryService inventoryService;
    private InventoryLevel level;

    @BeforeEach
    void setUp() {
        inventoryService = new InventoryService(productRepository, movementRepository, kafkaProductProducer);
        level = InventoryLevel.builder()
                .warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID)
                .warehouseName(InventoryService.DEFAULT_WAREHOUSE_NAME)
                .onHandQuantity(10)
                .reservedQuantity(0)
                .soldQuantity(0)
                .build();

        ProductVariant variant = ProductVariant.builder()
                .id("variant-1")
                .name("100 ml")
                .sku("SKU-100")
                .price(100_000D)
                .isActive(true)
                .trackInventory(true)
                .inventoryLevels(new ArrayList<>(List.of(level)))
                .build();
        Product product = Product.builder()
                .id("product-1")
                .name("Cleanser")
                .slug("cleanser")
                .price(100_000D)
                .isActive(true)
                .variants(new ArrayList<>(List.of(variant)))
                .build();

        lenient().when(productRepository.findByFlexibleId("product-1")).thenReturn(Optional.of(product));
    }

    @Test
    void reserveMovesAvailableStockToReserved() {
        stubReserveAllowed();

        var response = inventoryService.reserve(request("ORD-1", 3));

        assertThat(level.getOnHandQuantity()).isEqualTo(10);
        assertThat(level.getReservedQuantity()).isEqualTo(3);
        assertThat(response.getTotalAmount()).isEqualByComparingTo("300000");
        verify(productRepository).saveAllFlexible(any());
        verify(movementRepository).saveAll(anyList());
    }

    @Test
    void repeatedReserveForSameOrderDoesNotReserveTwice() {
        level.setReservedQuantity(3);
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE))
                .thenReturn(List.of(movement(InventoryMovement.MovementType.RESERVE, 3)));

        inventoryService.reserve(request("ORD-1", 3));

        assertThat(level.getReservedQuantity()).isEqualTo(3);
        verify(productRepository, never()).saveAllFlexible(any());
    }

    @Test
    void repeatedReserveWithDifferentQuantityIsRejected() {
        level.setReservedQuantity(3);
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE))
                .thenReturn(List.of(movement(InventoryMovement.MovementType.RESERVE, 3)));

        assertThatThrownBy(() -> inventoryService.reserve(request("ORD-1", 2)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không khớp SKU hoặc số lượng");
    }

    @Test
    void commitConvertsReservedStockToSold() {
        level.setReservedQuantity(3);
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.COMMIT_SALE))
                .thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE))
                .thenReturn(List.of(movement(InventoryMovement.MovementType.RESERVE, 3)));
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RELEASE))
                .thenReturn(List.of());

        inventoryService.commit(request("ORD-1", 3));

        assertThat(level.getOnHandQuantity()).isEqualTo(7);
        assertThat(level.getReservedQuantity()).isZero();
        assertThat(level.getSoldQuantity()).isEqualTo(3);
    }

    @Test
    void releaseWithoutPreviousReserveIsRejected() {
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RELEASE)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE)).thenReturn(List.of());

        assertThatThrownBy(() -> inventoryService.release(request("ORD-1", 3)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chưa reserve");
    }

    @Test
    void reserveRejectsQuantityGreaterThanAvailable() {
        stubReserveAllowed();

        assertThatThrownBy(() -> inventoryService.reserve(request("ORD-1", 11)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chỉ còn 10");
        verify(productRepository, never()).saveAllFlexible(any());
    }

    @Test
    void receiptAddsPhysicalStockAndRecordsReceiptMovement() {
        stubAdjustmentPersistence();
        var response = inventoryService.adjust(adjustment(
                InventoryAdjustmentRequest.OperationType.RECEIPT, 5, "Nhập hàng từ nhà cung cấp"));

        assertThat(level.getOnHandQuantity()).isEqualTo(15);
        assertThat(response.getType()).isEqualTo("STOCK_RECEIPT");
        assertThat(response.getQuantity()).isEqualTo(5);
    }

    @Test
    void countCanCorrectPhysicalStockDownToReservedQuantity() {
        level.setReservedQuantity(3);
        stubAdjustmentPersistence();
        var request = adjustment(
                InventoryAdjustmentRequest.OperationType.COUNT, -7, "Kiểm kê cuối ngày");
        request.setQuantityDelta(-1); // Simulates a stale client-side delta; target quantity remains authoritative.

        var response = inventoryService.adjust(request);

        assertThat(level.getOnHandQuantity()).isEqualTo(3);
        assertThat(response.getType()).isEqualTo("STOCK_COUNT");
    }

    @Test
    void writeOffRejectsPositiveDelta() {
        assertThatThrownBy(() -> inventoryService.adjust(adjustment(
                InventoryAdjustmentRequest.OperationType.WRITE_OFF, 2, "Sai chiều")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("làm giảm tồn kho");
    }

    @Test
    void adjustmentCannotReduceOnHandBelowReservedStock() {
        level.setReservedQuantity(4);

        assertThatThrownBy(() -> inventoryService.adjust(adjustment(
                InventoryAdjustmentRequest.OperationType.WRITE_OFF, -7, "Hàng hỏng")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("thấp hơn số lượng đang giữ");
    }

    @Test
    void saleableReturnRestoresOnHandAndReducesSoldQuantity() {
        level.setOnHandQuantity(7);
        level.setSoldQuantity(3);
        stubReturnNotProcessed();

        inventoryService.processReturn(returnRequest(InventoryReturnRequest.Disposition.RESTOCK, 2));

        assertThat(level.getOnHandQuantity()).isEqualTo(9);
        assertThat(level.getSoldQuantity()).isEqualTo(1);
        verify(productRepository).saveAllFlexible(any());
        verify(movementRepository).saveAll(anyList());
    }

    @Test
    void damagedReturnReducesSoldWithoutRestoringSaleableStock() {
        level.setOnHandQuantity(7);
        level.setSoldQuantity(3);
        stubReturnNotProcessed();

        inventoryService.processReturn(returnRequest(InventoryReturnRequest.Disposition.DAMAGED, 2));

        assertThat(level.getOnHandQuantity()).isEqualTo(7);
        assertThat(level.getSoldQuantity()).isEqualTo(1);
    }

    @Test
    void repeatedReturnDoesNotChangeInventoryTwice() {
        level.setOnHandQuantity(9);
        level.setSoldQuantity(1);
        InventoryMovement existing = movement(InventoryMovement.MovementType.RETURN_RESTOCK, 2);
        existing.setReferenceType("RETURN_ORDER");
        existing.setReferenceId("RET-1");
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "RETURN_ORDER", "RET-1", InventoryMovement.MovementType.RETURN_RESTOCK))
                .thenReturn(List.of(existing));

        inventoryService.processReturn(returnRequest(InventoryReturnRequest.Disposition.RESTOCK, 2));

        assertThat(level.getOnHandQuantity()).isEqualTo(9);
        assertThat(level.getSoldQuantity()).isEqualTo(1);
        verify(productRepository, never()).saveAllFlexible(any());
    }

    private void stubReserveAllowed() {
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.RELEASE)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "ORDER", "ORD-1", InventoryMovement.MovementType.COMMIT_SALE)).thenReturn(List.of());
    }

    private void stubAdjustmentPersistence() {
        when(productRepository.saveFlexible(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(movementRepository.save(any(InventoryMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubReturnNotProcessed() {
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "RETURN_ORDER", "RET-1", InventoryMovement.MovementType.RETURN_RESTOCK)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                "RETURN_ORDER", "RET-1", InventoryMovement.MovementType.RETURN_DAMAGED)).thenReturn(List.of());
    }

    private InventoryReturnRequest returnRequest(InventoryReturnRequest.Disposition disposition, int quantity) {
        return InventoryReturnRequest.builder()
                .returnOrderId("RET-1")
                .orderCode("ORD-1")
                .disposition(disposition)
                .items(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(quantity)
                        .build()))
                .build();
    }

    private InventoryReservationRequest request(String orderCode, int quantity) {
        return InventoryReservationRequest.builder()
                .orderCode(orderCode)
                .items(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(quantity)
                        .build()))
                .build();
    }

    private InventoryAdjustmentRequest adjustment(
            InventoryAdjustmentRequest.OperationType operationType,
            int quantityDelta,
            String reason) {
        return InventoryAdjustmentRequest.builder()
                .productId("product-1")
                .variantId("variant-1")
                .warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID)
                .operationType(operationType)
                .quantityDelta(quantityDelta)
                .targetQuantity(operationType == InventoryAdjustmentRequest.OperationType.COUNT
                        ? level.getOnHandQuantity() + quantityDelta
                        : null)
                .reason(reason)
                .build();
    }

    private InventoryMovement movement(InventoryMovement.MovementType type, int quantity) {
        return InventoryMovement.builder()
                .productId("product-1")
                .variantId("variant-1")
                .warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID)
                .type(type)
                .quantity(quantity)
                .referenceType("ORDER")
                .referenceId("ORD-1")
                .build();
    }
}
