package mss.productservice.controller;

import mss.productservice.model.Product;
import mss.productservice.service.DataImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products/import")
public class DataImportController {

    private final DataImportService dataImportService;

    public DataImportController(DataImportService dataImportService) {
        this.dataImportService = dataImportService;
    }

    @PostMapping("/json")
    public ResponseEntity<String> importProducts(@RequestBody List<Product> products) {
        if (products == null || products.isEmpty()) {
            return ResponseEntity.badRequest().body("Payload cannot be empty");
        }
        int count = dataImportService.importProducts(products);
        return ResponseEntity.ok("Successfully imported " + count + " products.");
    }
}
