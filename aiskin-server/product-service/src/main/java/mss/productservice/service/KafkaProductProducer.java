package mss.productservice.service;

import lombok.extern.slf4j.Slf4j;
import mss.productservice.model.Product;
import org.springframework.kafka.core.KafkaTemplate;
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

    public void sendProduct(Product product) {
        log.info("Sending product event to Kafka: {}", product.getId());
        try {
            String json = objectMapper.writeValueAsString(product);
            kafkaTemplate.send(TOPIC, product.getId(), json);
        } catch (Exception e) {
            log.error("Error serializing product", e);
        }
    }
    
    public void sendBulkProducts(List<Product> products) {
        log.info("Sending bulk product sync to Kafka. Count: {}", products.size());
        for (Product product : products) {
            try {
                String json = objectMapper.writeValueAsString(product);
                kafkaTemplate.send(TOPIC, product.getId(), json);
            } catch (Exception e) {
                log.error("Error serializing product", e);
            }
        }
    }
}
