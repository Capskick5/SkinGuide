package mss.productservice.config;

import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.boot.health.contributor.Status;
import org.springframework.data.mongodb.core.MongoTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProductDatabaseHealthIndicatorTest {

    @Test
    void reportsUpWhenAtlasDatabaseRespondsToPing() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        MongoDatabase database = mock(MongoDatabase.class);
        when(mongoTemplate.executeCommand(any(Document.class))).thenReturn(new Document("ok", 1));
        when(mongoTemplate.getDb()).thenReturn(database);
        when(database.getName()).thenReturn("aiskin_product");

        var health = new ProductDatabaseHealthIndicator(mongoTemplate).health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsEntry("database", "aiskin_product");
    }

    @Test
    void reportsDownWhenDatabasePingFails() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        when(mongoTemplate.executeCommand(any(Document.class)))
                .thenThrow(new IllegalStateException("database unavailable"));

        var health = new ProductDatabaseHealthIndicator(mongoTemplate).health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
    }
}
