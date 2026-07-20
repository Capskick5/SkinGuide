package mss.productservice.repository;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.model.Product;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import com.mongodb.client.result.UpdateResult;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

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

    @Test
    void updatesLegacyObjectIdWithoutInsertingDuplicateProduct() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        MongoCollection<Document> collection = mockCollection(mongoTemplate);
        MongoConverter converter = mock(MongoConverter.class);
        UpdateResult updateResult = mock(UpdateResult.class);
        Product product = Product.builder()
                .id("6a3e2b70b4a9c15cfa665676")
                .slug("legacy-product")
                .build();
        when(mongoTemplate.getConverter()).thenReturn(converter);
        when(collection.countDocuments(any(Document.class))).thenReturn(1L);
        when(collection.replaceOne(any(Document.class), any(Document.class), any()))
                .thenReturn(updateResult);
        when(updateResult.getMatchedCount()).thenReturn(1L);

        Product saved = new ProductRepositoryCustomImpl(mongoTemplate).saveFlexible(product);

        ArgumentCaptor<Document> filter = ArgumentCaptor.forClass(Document.class);
        verify(collection).replaceOne(filter.capture(), any(Document.class), any());
        assertThat(filter.getValue().get("_id")).isInstanceOf(org.bson.types.ObjectId.class);
        assertThat(filter.getValue()).containsKey("$or");
        assertThat(saved).isSameAs(product);
        assertThat(saved.getVersion()).isZero();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    void updatesExistingProductOnlyWhenVersionMatches() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        MongoCollection<Document> collection = mockCollection(mongoTemplate);
        MongoConverter converter = mock(MongoConverter.class);
        UpdateResult updateResult = mock(UpdateResult.class);
        Product product = Product.builder().id("product-1").version(4L).build();
        when(mongoTemplate.getConverter()).thenReturn(converter);
        when(collection.replaceOne(any(Document.class), any(Document.class), any()))
                .thenReturn(updateResult);
        when(updateResult.getMatchedCount()).thenReturn(1L);

        Product saved = new ProductRepositoryCustomImpl(mongoTemplate).saveFlexible(product);

        ArgumentCaptor<Document> filter = ArgumentCaptor.forClass(Document.class);
        verify(collection).replaceOne(filter.capture(), any(Document.class), any());
        assertThat(filter.getValue()).containsEntry("version", 4L);
        assertThat(saved.getVersion()).isEqualTo(5L);
    }

    @Test
    void capsAdvancedSearchPageSize() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        when(mongoTemplate.count(any(Query.class), org.mockito.ArgumentMatchers.eq(Product.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), org.mockito.ArgumentMatchers.eq(Product.class))).thenReturn(java.util.List.of());
        ProductSearchRequest request = ProductSearchRequest.builder().page(1).size(10_000).build();

        var result = new ProductRepositoryCustomImpl(mongoTemplate).searchAdvanced(request);

        assertThat(result.getSize()).isEqualTo(100);
    }

    @Test
    void appliesMinAndMaxPriceRangeToQuery() {
        ProductSearchRequest request = ProductSearchRequest.builder().minPrice(100_000d).maxPrice(500_000d).build();

        Query capturedQuery = captureSearchQuery(request);

        Document priceCondition = (Document) extractAndCondition(capturedQuery, "price");
        assertThat(priceCondition.get("$gte")).isEqualTo(100_000d);
        assertThat(priceCondition.get("$lte")).isEqualTo(500_000d);
    }

    @Test
    void appliesOnlyMinPriceWhenMaxPriceAbsent() {
        ProductSearchRequest request = ProductSearchRequest.builder().minPrice(200_000d).build();

        Query capturedQuery = captureSearchQuery(request);

        Document priceCondition = (Document) extractAndCondition(capturedQuery, "price");
        assertThat(priceCondition.get("$gte")).isEqualTo(200_000d);
        assertThat(priceCondition.containsKey("$lte")).isFalse();
    }

    @Test
    void appliesBrandIdFilterIndependentlyOfCategory() {
        ProductSearchRequest request = ProductSearchRequest.builder().brandId("brand-123").build();

        Query capturedQuery = captureSearchQuery(request);

        assertThat(extractAndCondition(capturedQuery, "brandId")).isEqualTo("brand-123");
    }

    @Test
    void ignoresBrandIdFilterWhenSetToAll() {
        ProductSearchRequest request = ProductSearchRequest.builder().brandId("all").build();

        Query capturedQuery = captureSearchQuery(request);

        assertThat(capturedQuery.getQueryObject().containsKey("$and")).isFalse();
    }

    @Test
    void appliesSkinTypeAndConcernFilters() {
        ProductSearchRequest request = ProductSearchRequest.builder().skinType("Oily").concern("Acne").build();

        Query capturedQuery = captureSearchQuery(request);

        assertThat(extractAndCondition(capturedQuery, "targetSkinTypes")).isEqualTo("Oily");
        assertThat(extractAndCondition(capturedQuery, "targetConcerns")).isEqualTo("Acne");
    }

    @Test
    void appliesInStockOnlyExpressionFilter() {
        ProductSearchRequest request = ProductSearchRequest.builder().inStockOnly(true).build();

        Query capturedQuery = captureSearchQuery(request);

        Document andDoc = capturedQuery.getQueryObject();
        @SuppressWarnings("unchecked")
        List<Document> andList = (List<Document>) andDoc.get("$and");
        assertThat(andList).anySatisfy(condition -> assertThat(condition.containsKey("$expr")).isTrue());
    }

    @Test
    void skipsInStockOnlyExpressionWhenFalseOrNull() {
        ProductSearchRequest request = ProductSearchRequest.builder().inStockOnly(false).build();

        Query capturedQuery = captureSearchQuery(request);

        assertThat(capturedQuery.getQueryObject().containsKey("$and")).isFalse();
    }

    @SuppressWarnings("unchecked")
    private Query captureSearchQuery(ProductSearchRequest request) {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        when(mongoTemplate.count(any(Query.class), org.mockito.ArgumentMatchers.eq(Product.class))).thenReturn(0L);
        when(mongoTemplate.find(any(Query.class), org.mockito.ArgumentMatchers.eq(Product.class))).thenReturn(java.util.List.of());

        new ProductRepositoryCustomImpl(mongoTemplate).searchAdvanced(request);

        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).find(captor.capture(), org.mockito.ArgumentMatchers.eq(Product.class));
        return captor.getValue();
    }

    @SuppressWarnings("unchecked")
    private Object extractAndCondition(Query query, String field) {
        Document root = query.getQueryObject();
        List<Document> andList = (List<Document>) root.get("$and");
        assertThat(andList).isNotNull();
        return andList.stream()
                .filter(doc -> doc.containsKey(field))
                .map(doc -> doc.get(field))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No $and condition found for field: " + field));
    }

    @SuppressWarnings("unchecked")
    private MongoCollection<Document> mockCollection(MongoTemplate mongoTemplate) {
        MongoCollection<Document> collection = mock(MongoCollection.class);
        when(mongoTemplate.getCollectionName(Product.class)).thenReturn("products");
        when(mongoTemplate.getCollection("products")).thenReturn(collection);
        return collection;
    }
}
