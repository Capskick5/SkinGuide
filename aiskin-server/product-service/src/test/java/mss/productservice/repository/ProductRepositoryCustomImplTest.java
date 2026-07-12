package mss.productservice.repository;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import mss.productservice.model.Product;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProductRepositoryCustomImplTest {

    @Test
    void findsLegacyAtlasProductStoredWithObjectId() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        MongoCollection<Document> collection = mockCollection(mongoTemplate);
        FindIterable<Document> findResult = mock(FindIterable.class);
        MongoConverter converter = mock(MongoConverter.class);
        Document document = new Document("_id", new org.bson.types.ObjectId("6a3e2b70b4a9c15cfa665676"));
        Product product = Product.builder().id("6a3e2b70b4a9c15cfa665676").build();
        when(collection.find(any(Document.class))).thenReturn(findResult);
        when(findResult.first()).thenReturn(document);
        when(mongoTemplate.getConverter()).thenReturn(converter);
        when(converter.read(Product.class, document)).thenReturn(product);

        var result = new ProductRepositoryCustomImpl(mongoTemplate)
                .findByFlexibleId("6a3e2b70b4a9c15cfa665676");

        assertThat(result).contains(product);
    }

    @Test
    void fallsBackToStringIdForNewProducts() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        MongoCollection<Document> collection = mockCollection(mongoTemplate);
        FindIterable<Document> findResult = mock(FindIterable.class);
        MongoConverter converter = mock(MongoConverter.class);
        Document document = new Document("_id", "product-1");
        Product product = Product.builder().id("product-1").build();
        when(collection.find(any(Document.class))).thenReturn(findResult);
        when(findResult.first()).thenReturn(document);
        when(mongoTemplate.getConverter()).thenReturn(converter);
        when(converter.read(Product.class, document)).thenReturn(product);

        var result = new ProductRepositoryCustomImpl(mongoTemplate).findByFlexibleId("product-1");

        assertThat(result).contains(product);
    }

    @SuppressWarnings("unchecked")
    private MongoCollection<Document> mockCollection(MongoTemplate mongoTemplate) {
        MongoCollection<Document> collection = mock(MongoCollection.class);
        when(mongoTemplate.getCollectionName(Product.class)).thenReturn("products");
        when(mongoTemplate.getCollection("products")).thenReturn(collection);
        return collection;
    }
}
