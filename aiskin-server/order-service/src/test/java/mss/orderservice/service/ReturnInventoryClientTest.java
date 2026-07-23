package mss.orderservice.service;

import mss.orderservice.dto.ProductInventoryApiResponse;
import mss.orderservice.dto.ProductReturnInventoryRequest;
import mss.orderservice.model.ReturnOrder;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReturnInventoryClientTest {

    @Test
    void wrongDeliverySendsActualAndExpectedProductsSeparately() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        ReturnInventoryClient client = new ReturnInventoryClient(
                restTemplate, "http://product-service", "internal-token");
        ProductInventoryApiResponse response = new ProductInventoryApiResponse();
        response.setSuccess(true);
        when(restTemplate.postForObject(
                eq("http://product-service/api/products/inventory/internal/process-return"),
                any(HttpEntity.class),
                eq(ProductInventoryApiResponse.class)))
                .thenReturn(response);
        ReturnOrder returnOrder = ReturnOrder.builder()
                .id("return-1")
                .orderCode("ORD-1")
                .claimType(ReturnOrder.ClaimType.WRONG_ITEM)
                .items(List.of(ReturnOrder.ReturnItem.builder()
                        .productId("expected-product")
                        .variantId("expected-variant")
                        .quantity(1)
                        .build()))
                .wrongItems(List.of(ReturnOrder.WrongItem.builder()
                        .productId("actual-product")
                        .variantId("actual-variant")
                        .quantity(1)
                        .build()))
                .build();

        client.process(returnOrder, ReturnOrder.InventoryDisposition.RESTOCK);

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForObject(
                eq("http://product-service/api/products/inventory/internal/process-return"),
                entityCaptor.capture(),
                eq(ProductInventoryApiResponse.class));
        ProductReturnInventoryRequest request =
                (ProductReturnInventoryRequest) entityCaptor.getValue().getBody();
        assertThat(request).isNotNull();
        assertThat(request.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getProductId()).isEqualTo("actual-product");
            assertThat(item.getVariantId()).isEqualTo("actual-variant");
        });
        assertThat(request.getExpectedItems()).singleElement().satisfies(item -> {
            assertThat(item.getProductId()).isEqualTo("expected-product");
            assertThat(item.getVariantId()).isEqualTo("expected-variant");
        });
        assertThat(request.getDisposition()).isEqualTo("RESTOCK");
    }
}
