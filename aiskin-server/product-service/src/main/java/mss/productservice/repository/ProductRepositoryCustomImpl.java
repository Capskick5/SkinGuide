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
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.bson.Document;
import org.bson.types.ObjectId;
import com.mongodb.client.model.ReplaceOptions;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Collection;
import java.time.Instant;

@Repository
@RequiredArgsConstructor
public class ProductRepositoryCustomImpl implements ProductRepositoryCustom {

    private static final int MAX_PAGE_SIZE = 100;

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
        Document replacement = new Document();
        mongoTemplate.getConverter().write(product, replacement);
        replacement.put("_id", storedId);

        var result = collection.replaceOne(
                new Document("_id", storedId),
                replacement,
                new ReplaceOptions().upsert(false));
        if (result.getMatchedCount() != 1) {
            throw new IllegalStateException("Product no longer exists: " + product.getId());
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
    public Page<Product> searchAdvanced(ProductSearchRequest request) {
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

        // 3. Search query
        if (StringUtils.hasText(request.getQuery())) {
            String q = request.getQuery();
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
}
