package mss.orderservice.service;

import mss.orderservice.dto.ProductInventoryApiResponse;
import mss.orderservice.dto.ProductInventoryItemRequest;
import mss.orderservice.dto.ProductReturnInventoryRequest;
import mss.orderservice.model.ReturnOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
public class ReturnInventoryClient {

    private final RestTemplate restTemplate;
    private final String productServiceBaseUrl;
    private final String internalServiceToken;

    public ReturnInventoryClient(
            RestTemplate restTemplate,
            @Value("${product-service.base-url}") String productServiceBaseUrl,
            @Value("${product-service.internal-token}") String internalServiceToken) {
        this.restTemplate = restTemplate;
        this.productServiceBaseUrl = productServiceBaseUrl;
        this.internalServiceToken = internalServiceToken;
    }

    public void process(ReturnOrder returnOrder, ReturnOrder.InventoryDisposition disposition) {
        ProductReturnInventoryRequest request = ProductReturnInventoryRequest.builder()
                .returnOrderId(returnOrder.getId())
                .orderCode(returnOrder.getOrderCode())
                .disposition(disposition.name())
                .items(returnOrder.getItems().stream()
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
        ProductInventoryApiResponse response;
        try {
            response = restTemplate.postForObject(
                    productServiceBaseUrl + "/api/products/inventory/internal/process-return",
                    new HttpEntity<>(request, headers),
                    ProductInventoryApiResponse.class);
        } catch (Exception exception) {
            throw new ResponseStatusException(BAD_GATEWAY,
                    "Không thể cập nhật tồn kho cho đơn trả hàng", exception);
        }
        if (response == null || !Boolean.TRUE.equals(response.getSuccess())) {
            throw new ResponseStatusException(BAD_GATEWAY,
                    response != null && response.getMessage() != null
                            ? response.getMessage()
                            : "Product service returned an invalid inventory response");
        }
    }
}
