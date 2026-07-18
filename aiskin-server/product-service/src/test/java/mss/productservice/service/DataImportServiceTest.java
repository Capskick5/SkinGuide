package mss.productservice.service;

import mss.productservice.model.Product;
import mss.productservice.repository.BrandRepository;
import mss.productservice.repository.CategoryRepository;
import mss.productservice.repository.IngredientRepository;
import mss.productservice.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DataImportServiceTest {

    private final ProductRepository productRepository = mock(ProductRepository.class);

    private final IDataImportService service = new DataImportService(productRepository, mock(BrandRepository.class), mock(CategoryRepository.class), mock(IngredientRepository.class));

    @Test
    void skipsExistingProductSoRepeatedSeedDoesNotDuplicateAtlasData() {
        Product product = Product.builder().name("Gentle Cleanser").slug("gentle-cleanser").build();
        when(productRepository.existsBySlug("gentle-cleanser")).thenReturn(true);
        DataImportService.ImportResult result = service.importProducts(List.of(product));
        assertThat(result).isEqualTo(new DataImportService.ImportResult(0, 1, 1));
        verify(productRepository, never()).save(product);
    }

    @Test
    void generatesSlugAndImportsNewProduct() {
        Product product = Product.builder().name("Gentle Cleanser").build();
        when(productRepository.existsBySlug("gentle-cleanser")).thenReturn(false);
        DataImportService.ImportResult result = service.importProducts(List.of(product));
        assertThat(product.getSlug()).isEqualTo("gentle-cleanser");
        assertThat(result).isEqualTo(new DataImportService.ImportResult(1, 0, 1));
        verify(productRepository).save(product);
    }
}
