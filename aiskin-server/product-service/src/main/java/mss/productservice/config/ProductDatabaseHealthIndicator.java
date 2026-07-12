package mss.productservice.config;

import org.bson.Document;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

@Component
public class ProductDatabaseHealthIndicator implements HealthIndicator {

    private final MongoTemplate mongoTemplate;

    public ProductDatabaseHealthIndicator(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Health health() {
        try {
            mongoTemplate.executeCommand(new Document("ping", 1));
            return Health.up().withDetail("database", mongoTemplate.getDb().getName()).build();
        } catch (Exception exception) {
            return Health.down(exception).build();
        }
    }
}
