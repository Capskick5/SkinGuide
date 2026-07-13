package mss.productservice.service;

import mss.productservice.dto.request.InventoryAdjustmentRequest;
import mss.productservice.model.InventoryLevel;
import mss.productservice.model.Product;
import mss.productservice.model.ProductVariant;
import mss.productservice.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DemoInventoryServiceTest {

    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final InventoryService inventoryService = mock(InventoryService.class);
    private final DemoInventoryService service = new DemoInventoryService(productRepository, inventoryService);

    @Test
    void initializesOnlyEmptyTrackedVariantsUsingReceiptMovement() {
        ProductVariant empty = ProductVariant.builder()
                .id("variant-empty")
                .trackInventory(true)
                .inventoryLevels(List.of())
                .build();
        ProductVariant stocked = ProductVariant.builder()
                .id("variant-stocked")
                .trackInventory(true)
                .inventoryLevels(List.of(InventoryLevel.builder()
                        .warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID)
                        .onHandQuantity(5)
                        .build()))
                .build();
        when(productRepository.findAll()).thenReturn(List.of(Product.builder()
                .id("product-1")
                .variants(List.of(empty, stocked))
                .build()));

        DemoInventoryService.SeedInventoryResult result = service.seedMissingInventory(50);

        assertThat(result.initializedVariants()).isEqualTo(1);
        assertThat(result.skippedVariants()).isEqualTo(1);
        ArgumentCaptor<InventoryAdjustmentRequest> captor = ArgumentCaptor.forClass(InventoryAdjustmentRequest.class);
        verify(inventoryService).adjust(captor.capture());
        assertThat(captor.getValue().getOperationType()).isEqualTo(InventoryAdjustmentRequest.OperationType.RECEIPT);
        assertThat(captor.getValue().getQuantityDelta()).isEqualTo(50);
    }

    @Test
    void initializesSyntheticVariantForLegacyProduct() {
        when(productRepository.findAll()).thenReturn(List.of(Product.builder()
                .id("legacy-product")
                .slug("legacy-product")
                .price(120_000D)
                .isActive(true)
                .build()));

        DemoInventoryService.SeedInventoryResult result = service.seedMissingInventory(25);

        assertThat(result.initializedVariants()).isEqualTo(1);
        ArgumentCaptor<InventoryAdjustmentRequest> captor = ArgumentCaptor.forClass(InventoryAdjustmentRequest.class);
        verify(inventoryService).adjust(captor.capture());
        assertThat(captor.getValue().getVariantId()).isEqualTo("legacy-default");
        assertThat(captor.getValue().getQuantityDelta()).isEqualTo(25);
    }
}
