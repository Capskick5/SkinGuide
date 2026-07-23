// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.productservice.repository;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.ProductSearchRequest;
import mss.productservice.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.MongoExpression;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.dao.OptimisticLockingFailureException;
import org.bson.Document;
import org.bson.types.ObjectId;
import com.mongodb.client.model.ReplaceOptions;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import mss.productservice.dto.response.InventorySummaryResponse;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import java.util.Optional;
import java.util.Collection;
import java.time.Instant;
import java.util.regex.Pattern;

@Repository
@RequiredArgsConstructor
public class ProductRepositoryCustomImpl implements ProductRepositoryCustom {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_QUERY_LENGTH = 100;

    // Tổng số lượng còn bán được = sum(onHandQuantity - reservedQuantity) trên toàn bộ variants/inventoryLevels.
    // Mirror chính xác cách totalAvailable() ở ProductService tính toán (không lọc theo variant.isActive)
    // để "inStockOnly" nhất quán với số liệu tồn kho hiển thị cho người dùng.
    private static final String IN_STOCK_EXPR = "{ '$gt': [ { '$sum': { '$map': { "
            + "'input': { '$ifNull': ['$variants', []] }, 'as': 'v', "
            + "'in': { '$sum': { '$map': { "
            + "'input': { '$ifNull': ['$$v.inventoryLevels', []] }, 'as': 'lvl', "
            + "'in': { '$subtract': [ { '$ifNull': ['$$lvl.onHandQuantity', 0] }, { '$ifNull': ['$$lvl.reservedQuantity', 0] } ] } "
            + "} } } "
            + "} } }, 0 ] }";

    private static final String OUT_OF_STOCK_EXPR = "{ '$lte': [ { '$sum': { '$map': { "
            + "'input': { '$ifNull': ['$variants', []] }, 'as': 'v', "
            + "'in': { '$sum': { '$map': { "
            + "'input': { '$ifNull': ['$$v.inventoryLevels', []] }, 'as': 'lvl', "
            + "'in': { '$subtract': [ { '$ifNull': ['$$lvl.onHandQuantity', 0] }, { '$ifNull': ['$$lvl.reservedQuantity', 0] } ] } "
            + "} } } "
            + "} } }, 0 ] }";

    private final MongoTemplate mongoTemplate;

    @Override
    public Optional<Product> findByFlexibleId(String id) {
        if (!StringUtils.hasText(id)) {
            return Optional.empty();
        }
        var collection = mongoTemplate.getCollection(mongoTemplate.getCollectionName(Product.class));
        Document document = null;
        if (ObjectId.isValid(id)) {
            document = collection.find(new Document("_id", new ObjectId(id))).first();
        }
        if (document == null) {
            document = collection.find(new Document("_id", id)).first();
        }
        return Optional.ofNullable(document)
                .map(value -> mongoTemplate.getConverter().read(Product.class, value));
    }

    @Override
    public Product saveFlexible(Product product) {
        if (product.getId() == null) {
            return mongoTemplate.save(product);
        }

        var collection = mongoTemplate.getCollection(mongoTemplate.getCollectionName(Product.class));
        Object storedId = product.getId();
        if (ObjectId.isValid(product.getId())) {
            ObjectId objectId = new ObjectId(product.getId());
            if (collection.countDocuments(new Document("_id", objectId)) > 0) {
                storedId = objectId;
            }
        }
        product.setUpdatedAt(Instant.now());
        Long currentVersion = product.getVersion();
        product.setVersion(currentVersion == null ? 0L : currentVersion + 1L);
        Document replacement = new Document();
        mongoTemplate.getConverter().write(product, replacement);
        replacement.put("_id", storedId);

        Document versionedFilter = new Document("_id", storedId);
        if (currentVersion == null) {
            versionedFilter.append("$or", List.of(
                    new Document("version", new Document("$exists", false)),
                    new Document("version", null)));
        } else {
            versionedFilter.append("version", currentVersion);
        }
        var result = collection.replaceOne(
                versionedFilter,
                replacement,
                new ReplaceOptions().upsert(false));
        if (result.getMatchedCount() != 1) {
            throw new OptimisticLockingFailureException(
                    "Product was updated by another inventory operation: " + product.getId());
        }
        return product;
    }

    @Override
    public List<Product> saveAllFlexible(Collection<Product> products) {
        List<Product> saved = new ArrayList<>();
        for (Product product : products) {
            saved.add(saveFlexible(product));
        }
        return saved;
    }

    @Override
    public InventorySummaryResponse getInventorySummary() {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.unwind("variants", true),
                Aggregation.unwind("variants.inventoryLevels", true),
                Aggregation.group()
                        .sum("variants.inventoryLevels.onHandQuantity").as("totalOnHand")
                        .sum("variants.inventoryLevels.reservedQuantity").as("totalReserved")
        );
        AggregationResults<Document> results = mongoTemplate.aggregate(agg, Product.class, Document.class);
        Document doc = results.getUniqueMappedResult();
        
        long totalOnHand = 0;
        long totalReserved = 0;
        if (doc != null) {
            Number onHandNum = doc.get("totalOnHand", Number.class);
            Number reservedNum = doc.get("totalReserved", Number.class);
            totalOnHand = onHandNum != null ? onHandNum.longValue() : 0;
            totalReserved = reservedNum != null ? reservedNum.longValue() : 0;
        }

        long productCount = mongoTemplate.count(new Query(), Product.class);
        
        Query outQuery = new Query();
        outQuery.addCriteria(Criteria.expr(MongoExpression.create(OUT_OF_STOCK_EXPR)));
        long outOfStockCount = mongoTemplate.count(outQuery, Product.class);
        
        Query lowQuery = new Query();
        lowQuery.addCriteria(Criteria.where("hasLowStock").is(true));
        long lowStockCount = mongoTemplate.count(lowQuery, Product.class);

        return InventorySummaryResponse.builder()
                .totalOnHand(totalOnHand)
                .totalReserved(totalReserved)
                .totalAvailable(totalOnHand - totalReserved)
                .productCount(productCount)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .build();
    }

    @Override
    public Page<Product> searchAdvanced(ProductSearchRequest request) {
        validateSearchRequest(request);
        Query query = new Query();
        Criteria criteria = new Criteria();
        List<Criteria> andCriteriaList = new ArrayList<>();

        // 1. Filter by isActive
        if (request.getIsActive() != null) {
            andCriteriaList.add(Criteria.where("isActive").is(request.getIsActive()));
        }

        // 2. Filter by categoryId
        if (StringUtils.hasText(request.getCategoryId()) && !"all".equals(request.getCategoryId())) {
            andCriteriaList.add(Criteria.where("categoryId").is(request.getCategoryId()));
        }

        // 2a. Filter by brandId (độc lập với categoryId)
        if (StringUtils.hasText(request.getBrandId()) && !"all".equals(request.getBrandId())) {
            andCriteriaList.add(Criteria.where("brandId").is(request.getBrandId()));
        }

        // 2b. Filter by skinType (Product.targetSkinTypes là mảng, .is() khớp phần tử chứa trong mảng)
        if (StringUtils.hasText(request.getSkinType()) && !"all".equals(request.getSkinType())) {
            andCriteriaList.add(Criteria.where("targetSkinTypes").is(request.getSkinType()));
        }

        // 2c. Filter by concern (Product.targetConcerns là mảng)
        if (StringUtils.hasText(request.getConcern()) && !"all".equals(request.getConcern())) {
            andCriteriaList.add(Criteria.where("targetConcerns").is(request.getConcern()));
        }

        // 2d. Filter by price range - Product.price là field giá gốc (cũng dùng cho sortBy price-asc/price-desc)
        if (request.getMinPrice() != null || request.getMaxPrice() != null) {
            Criteria priceCriteria = Criteria.where("price");
            if (request.getMinPrice() != null) {
                priceCriteria = priceCriteria.gte(request.getMinPrice());
            }
            if (request.getMaxPrice() != null) {
                priceCriteria = priceCriteria.lte(request.getMaxPrice());
            }
            andCriteriaList.add(priceCriteria);
        }

        // 2e. Filter by inStockOnly - chỉ trả sản phẩm có tổng số lượng còn bán được > 0
        if (Boolean.TRUE.equals(request.getInStockOnly())) {
            andCriteriaList.add(Criteria.expr(MongoExpression.create(IN_STOCK_EXPR)));
        }

        // 2f. Filter by stockStatus ("low" or "out")
        if (StringUtils.hasText(request.getStockStatus()) && !"all".equals(request.getStockStatus())) {
            if ("low".equals(request.getStockStatus())) {
                andCriteriaList.add(Criteria.where("hasLowStock").is(true));
            } else if ("out".equals(request.getStockStatus())) {
                andCriteriaList.add(Criteria.expr(MongoExpression.create(OUT_OF_STOCK_EXPR)));
            }
        }

        // 3. Search query
        if (StringUtils.hasText(request.getQuery())) {
            String q = Pattern.quote(request.getQuery().trim());
            String field = request.getSearchField();
            if (!StringUtils.hasText(field)) {
                field = "all";
            }

            Criteria searchCriteria = new Criteria();
            switch (field) {
                case "name":
                    searchCriteria = Criteria.where("name").regex(q, "i");
                    break;
                case "slug":
                    searchCriteria = Criteria.where("slug").regex(q, "i");
                    break;
                case "brand":
                    searchCriteria = Criteria.where("brandName").regex(q, "i");
                    break;
                case "category":
                    searchCriteria = Criteria.where("categoryName").regex(q, "i");
                    break;
                case "ingredient":
                    searchCriteria = new Criteria().orOperator(
                            Criteria.where("ingredients.name").regex(q, "i"),
                            Criteria.where("keyIngredientIds").regex(q, "i")
                    );
                    break;
                case "concern":
                    searchCriteria = new Criteria().orOperator(
                            Criteria.where("targetConcerns").regex(q, "i"),
                            Criteria.where("description").regex(q, "i")
                    );
                    break;
                case "all":
                default:
                    searchCriteria = new Criteria().orOperator(
                            Criteria.where("name").regex(q, "i"),
                            Criteria.where("slug").regex(q, "i"),
                            Criteria.where("brandName").regex(q, "i"),
                            Criteria.where("categoryName").regex(q, "i"),
                            Criteria.where("description").regex(q, "i"),
                            Criteria.where("ingredients.name").regex(q, "i"),
                            Criteria.where("targetConcerns").regex(q, "i"),
                            Criteria.where("targetSkinTypes").regex(q, "i"),
                            Criteria.where("keyIngredientIds").regex(q, "i")
                    );
                    break;
            }
            andCriteriaList.add(searchCriteria);
        }

        if (!andCriteriaList.isEmpty()) {
            criteria.andOperator(andCriteriaList.toArray(new Criteria[0]));
        }
        query.addCriteria(criteria);

        // 4. Count total before applying pagination
        long total = mongoTemplate.count(query, Product.class);

        // 5. Apply pagination and sorting
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt"); // Default relevance
        if (StringUtils.hasText(request.getSortBy())) {
            switch (request.getSortBy()) {
                case "name-asc":
                    sort = Sort.by(Sort.Direction.ASC, "name");
                    break;
                case "name-desc":
                    sort = Sort.by(Sort.Direction.DESC, "name");
                    break;
                case "price-asc":
                    sort = Sort.by(Sort.Direction.ASC, "price");
                    break;
                case "price-desc":
                    sort = Sort.by(Sort.Direction.DESC, "price");
                    break;
                case "relevance":
                default:
                    sort = Sort.by(Sort.Direction.DESC, "createdAt");
                    break;
            }
        }

        int pageSize = Math.min(Math.max(1, request.getSize()), MAX_PAGE_SIZE);
        PageRequest pageRequest = PageRequest.of(Math.max(0, request.getPage() - 1), pageSize, sort);
        query.with(pageRequest);

        List<Product> products = mongoTemplate.find(query, Product.class);

        return new PageImpl<>(products, pageRequest, total);
    }

    private void validateSearchRequest(ProductSearchRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Thông tin tìm kiếm không được để trống");
        }
        if (StringUtils.hasText(request.getQuery())
                && request.getQuery().trim().length() > MAX_SEARCH_QUERY_LENGTH) {
            throw new IllegalArgumentException("Từ khóa tìm kiếm không được vượt quá 100 ký tự");
        }
        Double minPrice = request.getMinPrice();
        Double maxPrice = request.getMaxPrice();
        if ((minPrice != null && (!Double.isFinite(minPrice) || minPrice < 0))
                || (maxPrice != null && (!Double.isFinite(maxPrice) || maxPrice < 0))) {
            throw new IllegalArgumentException("Khoảng giá phải là số không âm");
        }
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new IllegalArgumentException("Giá tối thiểu không được lớn hơn giá tối đa");
        }
    }
}
