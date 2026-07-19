// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.service;

import lombok.extern.slf4j.Slf4j;
import mss.productservice.model.Product;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

@Slf4j
@Service
public class KafkaProductProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "product-sync-topic";

    public KafkaProductProducer(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Async("productEventExecutor")
    public void sendProduct(Product product) {
        log.info("Sending product event to Kafka: {}", product.getId());
        try {
            String json = objectMapper.writeValueAsString(product);
            send(product.getId(), json);
        } catch (Exception e) {
            log.warn("Unable to queue product event for {}: {}", product.getId(), e.getMessage());
        }
    }

    @Async("productEventExecutor")
    public void sendBulkProducts(List<Product> products) {
        log.info("Sending bulk product sync to Kafka. Count: {}", products.size());
        for (Product product : products) {
            try {
                String json = objectMapper.writeValueAsString(product);
                send(product.getId(), json);
            } catch (Exception e) {
                log.warn("Unable to queue product event for {}: {}", product.getId(), e.getMessage());
            }
        }
    }

    private void send(String productId, String json) {
        kafkaTemplate.send(TOPIC, productId, json)
                .whenComplete((result, error) -> {
                    if (error != null) {
                        log.warn("Kafka product event failed for {}: {}", productId, error.getMessage());
                    } else {
                        log.debug("Kafka product event sent for {}", productId);
                    }
                });
    }
}
