package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.InventoryAdjustmentRequest;
import mss.productservice.model.InventoryLevel;
import mss.productservice.model.Product;
import mss.productservice.model.ProductVariant;
import mss.productservice.repository.ProductRepository;
import org.springframework.stereotype.Service;
import java.util.List;

public interface IDemoInventoryService {

    public record SeedInventoryResult(int initializedVariants, int skippedVariants, int totalVariants, int quantityPerVariant) {}

    SeedInventoryResult seedMissingInventory(int quantityPerVariant);
}
