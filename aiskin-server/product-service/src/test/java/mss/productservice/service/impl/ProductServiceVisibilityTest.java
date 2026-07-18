package mss.productservice.service.impl;
import mss.productservice.service.*;


import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.exception.ResourceNotFoundException;
import mss.productservice.model.Product;
import mss.productservice.repository.BrandRepository;
import mss.productservice.repository.CategoryRepository;
import mss.productservice.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductServiceVisibilityTest {

    private ProductRepository productRepository;

    private IProductService service;

    @BeforeEach
    void setUp() {
        productRepository = mock(ProductRepository.class);
        BrandRepository brandRepository = mock(BrandRepository.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        service = new ProductService(productRepository, brandRepository, categoryRepository, mock(KafkaProductProducer.class));
        when(brandRepository.findAllById(any())).thenReturn(List.of());
        when(categoryRepository.findAllById(any())).thenReturn(List.of());
    }

    @Test
    void publicCatalogOnlyLoadsActiveProducts() {
        when(productRepository.findByIsActiveTrue()).thenReturn(List.of());
        service.getProducts(false);
        verify(productRepository).findByIsActiveTrue();
        verify(productRepository, never()).findAll();
    }

    @Test
    void publicSearchCannotOverrideActiveFilter() {
        ProductSearchRequest request = ProductSearchRequest.builder().isActive(false).build();
        when(productRepository.searchAdvanced(request)).thenReturn(Page.empty());
        service.searchAdvanced(request, false);
        assertThat(request.getIsActive()).isTrue();
    }

    @Test
    void inactiveProductIsHiddenFromPublicDetailButVisibleToManagement() {
        Product inactive = Product.builder().id("product-hidden").name("Hidden product").isActive(false).build();
        when(productRepository.findByFlexibleId("product-hidden")).thenReturn(Optional.of(inactive));
        assertThatThrownBy(() -> service.getProductById("product-hidden", false)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(service.getProductById("product-hidden", true).getId()).isEqualTo("product-hidden");
    }
}


