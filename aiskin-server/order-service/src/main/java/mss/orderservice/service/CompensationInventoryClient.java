package mss.orderservice.service;

import mss.orderservice.dto.ProductInventoryApiResponse;
import mss.orderservice.dto.ProductInventoryItemRequest;
import mss.orderservice.dto.ProductInventoryRequest;
import mss.orderservice.model.CompensationOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
public class CompensationInventoryClient {
    private final RestTemplate restTemplate;
    private final String productServiceBaseUrl;
    private final String internalServiceToken;

    public CompensationInventoryClient(RestTemplate restTemplate,
                                       @Value("${product-service.base-url}") String productServiceBaseUrl,
                                       @Value("${product-service.internal-token}") String internalServiceToken) {
        this.restTemplate = restTemplate;
        this.productServiceBaseUrl = productServiceBaseUrl;
        this.internalServiceToken = internalServiceToken;
    }

    public void reserve(CompensationOrder order) {
        call("reserve", order);
    }

    public void commit(CompensationOrder order) {
        call("commit", order);
    }

    public void release(CompensationOrder order) {
        call("release", order);
    }

    private void call(String action, CompensationOrder order) {
        ProductInventoryRequest request = ProductInventoryRequest.builder()
                .orderCode("COMP-" + order.getId())
                .items(order.getItems().stream()
                        .map(item -> ProductInventoryItemRequest.builder()
                                .productId(item.getProductId())
                                .variantId(item.getVariantId())
                                .quantity(item.getQuantity())
                                .build())
                        .toList())
                .build();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Service-Token", internalServiceToken);
        try {
            ProductInventoryApiResponse response = restTemplate.postForObject(
                    productServiceBaseUrl + "/api/products/inventory/internal/" + action,
                    new HttpEntity<>(request, headers),
                    ProductInventoryApiResponse.class);
            if (response == null || !Boolean.TRUE.equals(response.getSuccess())) {
                throw new ResponseStatusException(BAD_GATEWAY,
                        response != null ? response.getMessage() : "Phản hồi tồn kho không hợp lệ");
            }
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(BAD_GATEWAY,
                    "Không thể " + action + " tồn kho cho đơn giao bù", exception);
        }
    }
}
