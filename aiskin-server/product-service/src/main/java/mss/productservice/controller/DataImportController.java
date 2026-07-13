package mss.productservice.controller;

import mss.productservice.model.Product;
import mss.productservice.service.DataImportService;
import mss.productservice.service.DemoInventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products/internal/import")
public class DataImportController {

    private final DataImportService dataImportService;
    private final DemoInventoryService demoInventoryService;

    public DataImportController(DataImportService dataImportService, DemoInventoryService demoInventoryService) {
        this.dataImportService = dataImportService;
        this.demoInventoryService = demoInventoryService;
    }

    @PostMapping("/json")
    public ResponseEntity<DataImportService.ImportResult> importProducts(@RequestBody List<Product> products) {
        if (products == null || products.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(dataImportService.importProducts(products));
    }

    @PostMapping("/demo-inventory")
    public ResponseEntity<DemoInventoryService.SeedInventoryResult> seedDemoInventory(
            @RequestParam(defaultValue = "50") int quantityPerVariant) {
        return ResponseEntity.ok(demoInventoryService.seedMissingInventory(quantityPerVariant));
    }
}
