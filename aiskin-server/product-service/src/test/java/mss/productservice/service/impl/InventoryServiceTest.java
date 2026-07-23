package mss.productservice.service.impl;
import mss.productservice.service.*;


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
import static org.mockito.Mockito.times;
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

    private IInventoryService inventoryService;

    private InventoryLevel level;
    private InventoryLevel wrongItemLevel;
    private InventoryLevel sameProductWrongVariantLevel;

    @BeforeEach
    void setUp() {
        inventoryService = new InventoryService(productRepository, movementRepository, kafkaProductProducer, new mss.productservice.service.FlashDealPolicy());
        level = InventoryLevel.builder().warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID).warehouseName(InventoryService.DEFAULT_WAREHOUSE_NAME).onHandQuantity(10).reservedQuantity(0).soldQuantity(0).build();
        ProductVariant variant = ProductVariant.builder().id("variant-1").name("100 ml").sku("SKU-100").price(100_000D).isActive(true).trackInventory(true).inventoryLevels(new ArrayList<>(List.of(level))).build();
        sameProductWrongVariantLevel = InventoryLevel.builder()
                .warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID)
                .warehouseName(InventoryService.DEFAULT_WAREHOUSE_NAME)
                .onHandQuantity(5)
                .reservedQuantity(0)
                .soldQuantity(0)
                .damagedQuantity(0)
                .build();
        ProductVariant sameProductWrongVariant = ProductVariant.builder()
                .id("variant-1b")
                .name("50 ml")
                .price(80_000D)
                .isActive(true)
                .trackInventory(true)
                .inventoryLevels(new ArrayList<>(List.of(sameProductWrongVariantLevel)))
                .build();
        Product product = Product.builder().id("product-1").name("Cleanser").slug("cleanser").price(100_000D).isActive(true).variants(new ArrayList<>(List.of(variant, sameProductWrongVariant))).build();
        lenient().when(productRepository.findByFlexibleId("product-1")).thenReturn(Optional.of(product));
        wrongItemLevel = InventoryLevel.builder()
                .warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID)
                .warehouseName(InventoryService.DEFAULT_WAREHOUSE_NAME)
                .onHandQuantity(8)
                .reservedQuantity(0)
                .soldQuantity(0)
                .damagedQuantity(0)
                .build();
        ProductVariant wrongVariant = ProductVariant.builder()
                .id("variant-2")
                .name("Kem dưỡng 50 g")
                .price(150_000D)
                .isActive(true)
                .trackInventory(true)
                .inventoryLevels(new ArrayList<>(List.of(wrongItemLevel)))
                .build();
        Product wrongProduct = Product.builder()
                .id("product-2")
                .name("Kem dưỡng")
                .slug("kem-duong")
                .price(150_000D)
                .isActive(true)
                .variants(new ArrayList<>(List.of(wrongVariant)))
                .build();
        lenient().when(productRepository.findByFlexibleId("product-2")).thenReturn(Optional.of(wrongProduct));
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
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE)).thenReturn(List.of(movement(InventoryMovement.MovementType.RESERVE, 3)));
        inventoryService.reserve(request("ORD-1", 3));
        assertThat(level.getReservedQuantity()).isEqualTo(3);
        verify(productRepository, never()).saveAllFlexible(any());
    }

    @Test
    void repeatedReserveWithDifferentQuantityIsRejected() {
        level.setReservedQuantity(3);
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE)).thenReturn(List.of(movement(InventoryMovement.MovementType.RESERVE, 3)));
        assertThatThrownBy(() -> inventoryService.reserve(request("ORD-1", 2))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("không khớp biến thể hoặc số lượng");
    }

    @Test
    void commitConvertsReservedStockToSold() {
        level.setReservedQuantity(3);
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.COMMIT_SALE)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE)).thenReturn(List.of(movement(InventoryMovement.MovementType.RESERVE, 3)));
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RELEASE)).thenReturn(List.of());
        inventoryService.commit(request("ORD-1", 3));
        assertThat(level.getOnHandQuantity()).isEqualTo(7);
        assertThat(level.getReservedQuantity()).isZero();
        assertThat(level.getSoldQuantity()).isEqualTo(3);
    }

    @Test
    void releaseWithoutPreviousReserveIsRejected() {
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RELEASE)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE)).thenReturn(List.of());
        assertThatThrownBy(() -> inventoryService.release(request("ORD-1", 3))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("chưa reserve");
    }

    @Test
    void reserveRejectsQuantityGreaterThanAvailable() {
        stubReserveAllowed();
        assertThatThrownBy(() -> inventoryService.reserve(request("ORD-1", 11))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("chỉ còn 10");
        verify(productRepository, never()).saveAllFlexible(any());
    }

    @Test
    void receiptAddsPhysicalStockAndRecordsReceiptMovement() {
        stubAdjustmentPersistence();
        var response = inventoryService.adjust(adjustment(InventoryAdjustmentRequest.OperationType.RECEIPT, 5, "Nhập hàng từ nhà cung cấp"));
        assertThat(level.getOnHandQuantity()).isEqualTo(15);
        assertThat(response.getType()).isEqualTo("STOCK_RECEIPT");
        assertThat(response.getQuantity()).isEqualTo(5);
    }

    @Test
    void countCanCorrectPhysicalStockDownToReservedQuantity() {
        level.setReservedQuantity(3);
        stubAdjustmentPersistence();
        var request = adjustment(InventoryAdjustmentRequest.OperationType.COUNT, -7, "Kiểm kê cuối ngày");
        // Simulates a stale client-side delta; target quantity remains authoritative.
        request.setQuantityDelta(-1);
        var response = inventoryService.adjust(request);
        assertThat(level.getOnHandQuantity()).isEqualTo(3);
        assertThat(response.getType()).isEqualTo("STOCK_COUNT");
    }

    @Test
    void writeOffRejectsPositiveDelta() {
        assertThatThrownBy(() -> inventoryService.adjust(adjustment(InventoryAdjustmentRequest.OperationType.WRITE_OFF, 2, "Sai chiều"))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("làm giảm tồn kho");
    }

    @Test
    void adjustmentCannotReduceOnHandBelowReservedStock() {
        level.setReservedQuantity(4);
        assertThatThrownBy(() -> inventoryService.adjust(adjustment(InventoryAdjustmentRequest.OperationType.WRITE_OFF, -7, "Hàng hỏng"))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("thấp hơn số lượng đang giữ");
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
    void discardedReturnReducesSoldWithoutRestoringStock() {
        level.setOnHandQuantity(7);
        level.setSoldQuantity(3);
        stubReturnNotProcessed();

        inventoryService.processReturn(returnRequest(InventoryReturnRequest.Disposition.DISCARD, 2));

        assertThat(level.getOnHandQuantity()).isEqualTo(7);
        assertThat(level.getSoldQuantity()).isEqualTo(1);
        assertThat(level.getDamagedQuantity()).isZero();
    }

    @Test
    void wrongDeliveryRestockReversesExpectedItemWithoutAddingWrongItemTwice() {
        level.setOnHandQuantity(9);
        level.setSoldQuantity(1);

        inventoryService.processReturn(wrongDeliveryReturn(InventoryReturnRequest.Disposition.RESTOCK));

        assertThat(level.getOnHandQuantity()).isEqualTo(10);
        assertThat(level.getSoldQuantity()).isZero();
        assertThat(wrongItemLevel.getOnHandQuantity()).isEqualTo(8);
        assertThat(wrongItemLevel.getSoldQuantity()).isZero();
    }

    @Test
    void wrongDeliveryDamagedMovesActualItemOutOfSaleableStock() {
        level.setOnHandQuantity(9);
        level.setSoldQuantity(1);

        inventoryService.processReturn(wrongDeliveryReturn(InventoryReturnRequest.Disposition.DAMAGED));

        assertThat(level.getOnHandQuantity()).isEqualTo(10);
        assertThat(level.getSoldQuantity()).isZero();
        assertThat(wrongItemLevel.getOnHandQuantity()).isEqualTo(7);
        assertThat(wrongItemLevel.getDamagedQuantity()).isEqualTo(1);
    }

    @Test
    void wrongDeliveryDiscardRemovesActualItemFromTrackedStock() {
        level.setOnHandQuantity(9);
        level.setSoldQuantity(1);

        inventoryService.processReturn(wrongDeliveryReturn(InventoryReturnRequest.Disposition.DISCARD));

        assertThat(level.getOnHandQuantity()).isEqualTo(10);
        assertThat(level.getSoldQuantity()).isZero();
        assertThat(wrongItemLevel.getOnHandQuantity()).isEqualTo(7);
        assertThat(wrongItemLevel.getDamagedQuantity()).isZero();
    }

    @Test
    void wrongDeliveryBetweenVariantsOfSameProductUsesOneConsistentProductSnapshot() {
        level.setOnHandQuantity(9);
        level.setSoldQuantity(1);
        InventoryReturnRequest request = InventoryReturnRequest.builder()
                .returnOrderId("RET-WRONG-SAME-PRODUCT")
                .orderCode("ORD-WRONG-SAME-PRODUCT")
                .disposition(InventoryReturnRequest.Disposition.RESTOCK)
                .expectedItems(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(1)
                        .build()))
                .items(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1b")
                        .quantity(1)
                        .build()))
                .build();

        inventoryService.processReturn(request);

        assertThat(level.getOnHandQuantity()).isEqualTo(10);
        assertThat(level.getSoldQuantity()).isZero();
        assertThat(sameProductWrongVariantLevel.getOnHandQuantity()).isEqualTo(5);
        verify(productRepository, times(1)).findByFlexibleId("product-1");
    }

    @Test
    void wrongDeliveryRejectsActualVariantThatMatchesExpectedVariant() {
        InventoryReturnRequest request = InventoryReturnRequest.builder()
                .returnOrderId("RET-WRONG-MATCH")
                .orderCode("ORD-WRONG-MATCH")
                .disposition(InventoryReturnRequest.Disposition.RESTOCK)
                .expectedItems(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(1)
                        .build()))
                .items(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(1)
                        .build()))
                .build();

        assertThatThrownBy(() -> inventoryService.processReturn(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không được trùng");
        verify(productRepository, never()).saveAllFlexible(any());
    }

    @Test
    void repeatedReturnDoesNotChangeInventoryTwice() {
        level.setOnHandQuantity(9);
        level.setSoldQuantity(1);
        InventoryMovement existing = movement(InventoryMovement.MovementType.RETURN_RESTOCK, 2);
        existing.setReferenceType("RETURN_ORDER");
        existing.setReferenceId("RET-1");
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("RETURN_ORDER", "RET-1", InventoryMovement.MovementType.RETURN_RESTOCK)).thenReturn(List.of(existing));
        inventoryService.processReturn(returnRequest(InventoryReturnRequest.Disposition.RESTOCK, 2));
        assertThat(level.getOnHandQuantity()).isEqualTo(9);
        assertThat(level.getSoldQuantity()).isEqualTo(1);
        verify(productRepository, never()).saveAllFlexible(any());
    }

    @Test
    void returnedCompensationRestockReleasesReservedQuantityWithoutChangingOnHand() {
        level.setReservedQuantity(1);
        stubReservedCompensation();

        inventoryService.processReservedReturn(
                compensationReturn(InventoryReturnRequest.Disposition.RESTOCK));

        assertThat(level.getReservedQuantity()).isZero();
        assertThat(level.getOnHandQuantity()).isEqualTo(10);
        assertThat(level.getDamagedQuantity()).isZero();
    }

    @Test
    void returnedDamagedCompensationMovesReservedStockToDamagedWarehouse() {
        level.setReservedQuantity(1);
        level.setDamagedQuantity(0);
        stubReservedCompensation();

        inventoryService.processReservedReturn(
                compensationReturn(InventoryReturnRequest.Disposition.DAMAGED));

        assertThat(level.getReservedQuantity()).isZero();
        assertThat(level.getOnHandQuantity()).isEqualTo(9);
        assertThat(level.getDamagedQuantity()).isEqualTo(1);
    }

    private void stubReserveAllowed() {
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RESERVE)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.RELEASE)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("ORDER", "ORD-1", InventoryMovement.MovementType.COMMIT_SALE)).thenReturn(List.of());
    }

    private void stubAdjustmentPersistence() {
        when(productRepository.saveFlexible(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(movementRepository.save(any(InventoryMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubReturnNotProcessed() {
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("RETURN_ORDER", "RET-1", InventoryMovement.MovementType.RETURN_RESTOCK)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("RETURN_ORDER", "RET-1", InventoryMovement.MovementType.RETURN_DAMAGED)).thenReturn(List.of());
        when(movementRepository.findByReferenceTypeAndReferenceIdAndType("RETURN_ORDER", "RET-1", InventoryMovement.MovementType.RETURN_DISCARD)).thenReturn(List.of());
    }

    private void stubReservedCompensation() {
        lenient().when(movementRepository.findByReferenceTypeAndReferenceIdAndType(
                        org.mockito.ArgumentMatchers.eq("ORDER"),
                        org.mockito.ArgumentMatchers.eq("COMP-comp-1"),
                        any(InventoryMovement.MovementType.class)))
                .thenAnswer(invocation -> invocation.getArgument(2)
                        == InventoryMovement.MovementType.RESERVE
                                ? List.of(movement(InventoryMovement.MovementType.RESERVE, 1))
                                : List.of());
    }

    private InventoryReturnRequest returnRequest(InventoryReturnRequest.Disposition disposition, int quantity) {
        return InventoryReturnRequest.builder().returnOrderId("RET-1").orderCode("ORD-1").disposition(disposition).items(List.of(InventoryReservationItemRequest.builder().productId("product-1").variantId("variant-1").quantity(quantity).build())).build();
    }

    private InventoryReturnRequest wrongDeliveryReturn(InventoryReturnRequest.Disposition disposition) {
        return InventoryReturnRequest.builder()
                .returnOrderId("RET-WRONG-1")
                .orderCode("ORD-WRONG-1")
                .disposition(disposition)
                .expectedItems(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(1)
                        .build()))
                .items(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-2")
                        .variantId("variant-2")
                        .quantity(1)
                        .build()))
                .build();
    }

    private InventoryReturnRequest compensationReturn(
            InventoryReturnRequest.Disposition disposition) {
        return InventoryReturnRequest.builder()
                .returnOrderId("comp-1")
                .orderCode("COMP-comp-1")
                .disposition(disposition)
                .items(List.of(InventoryReservationItemRequest.builder()
                        .productId("product-1")
                        .variantId("variant-1")
                        .quantity(1)
                        .build()))
                .build();
    }

    private InventoryReservationRequest request(String orderCode, int quantity) {
        return InventoryReservationRequest.builder().orderCode(orderCode).items(List.of(InventoryReservationItemRequest.builder().productId("product-1").variantId("variant-1").quantity(quantity).build())).build();
    }

    private InventoryAdjustmentRequest adjustment(InventoryAdjustmentRequest.OperationType operationType, int quantityDelta, String reason) {
        return InventoryAdjustmentRequest.builder().productId("product-1").variantId("variant-1").warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID).operationType(operationType).quantityDelta(quantityDelta).targetQuantity(operationType == InventoryAdjustmentRequest.OperationType.COUNT ? level.getOnHandQuantity() + quantityDelta : null).reason(reason).build();
    }

    private InventoryMovement movement(InventoryMovement.MovementType type, int quantity) {
        return InventoryMovement.builder().productId("product-1").variantId("variant-1").warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID).type(type).quantity(quantity).referenceType("ORDER").referenceId("ORD-1").build();
    }
}


