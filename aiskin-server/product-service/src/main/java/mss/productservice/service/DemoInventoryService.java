package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.InventoryAdjustmentRequest;
import mss.productservice.model.InventoryLevel;
import mss.productservice.model.Product;
import mss.productservice.model.ProductVariant;
import mss.productservice.repository.ProductRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DemoInventoryService implements IDemoInventoryService {

    private final ProductRepository productRepository;

    private final IInventoryService inventoryService;

    public SeedInventoryResult seedMissingInventory(int quantityPerVariant) {
        if (quantityPerVariant < 1 || quantityPerVariant > 1_000) {
            throw new IllegalArgumentException("Demo quantity must be between 1 and 1000");
        }
        int initialized = 0;
        int skipped = 0;
        for (Product product : productRepository.findAll()) {
            for (ProductVariant variant : variants(product)) {
                if (!Boolean.TRUE.equals(variant.getTrackInventory()) || hasMainWarehouseStock(variant)) {
                    skipped++;
                    continue;
                }
                inventoryService.adjust(InventoryAdjustmentRequest.builder().productId(product.getId()).variantId(variant.getId()).warehouseId(InventoryService.DEFAULT_WAREHOUSE_ID).operationType(InventoryAdjustmentRequest.OperationType.RECEIPT).quantityDelta(quantityPerVariant).reason("Nhập tồn kho demo ban đầu").build());
                initialized++;
            }
        }
        return new SeedInventoryResult(initialized, skipped, initialized + skipped, quantityPerVariant);
    }

    private List<ProductVariant> variants(Product product) {
        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            return product.getVariants();
        }
        String slug = product.getSlug() != null && !product.getSlug().isBlank() ? product.getSlug() : product.getId();
        return List.of(ProductVariant.builder().id("legacy-default").name("Default").sku((slug + "-default").toUpperCase()).price(product.getPrice()).isActive(Boolean.TRUE.equals(product.getIsActive())).trackInventory(true).inventoryLevels(List.of()).build());
    }

    private boolean hasMainWarehouseStock(ProductVariant variant) {
        if (variant.getInventoryLevels() == null) {
            return false;
        }
        return variant.getInventoryLevels().stream().filter(level -> InventoryService.DEFAULT_WAREHOUSE_ID.equals(level.getWarehouseId())).map(InventoryLevel::getOnHandQuantity).anyMatch(quantity -> quantity != null && quantity > 0);
    }

    public record SeedInventoryResult(int initializedVariants, int skippedVariants, int totalVariants, int quantityPerVariant) {
    }
}
