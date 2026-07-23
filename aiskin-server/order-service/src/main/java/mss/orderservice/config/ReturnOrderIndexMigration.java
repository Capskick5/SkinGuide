package mss.orderservice.config;

import com.mongodb.client.MongoCollection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.model.ReturnOrder;
import org.bson.Document;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

/**
 * Dữ liệu cũ chỉ cho phép một khiếu nại trên mỗi đơn hàng. Từ luồng khiếu nại
 * sau giao lại, orderId trở thành quan hệ một-nhiều; chỉ sourceCompensationOrderId
 * còn là duy nhất để chống tạo trùng khiếu nại cho cùng một lần giao lại.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReturnOrderIndexMigration implements ApplicationRunner {

    private final MongoTemplate mongoTemplate;

    @Override
    public void run(ApplicationArguments args) {
        MongoCollection<Document> collection = mongoTemplate.getCollection("return_orders");
        for (Document index : collection.listIndexes()) {
            Document keys = index.get("key", Document.class);
            boolean legacyUniqueOrderIndex = keys != null
                    && keys.size() == 1
                    && keys.containsKey("orderId")
                    && Boolean.TRUE.equals(index.getBoolean("unique"));
            if (legacyUniqueOrderIndex) {
                String name = index.getString("name");
                collection.dropIndex(name);
                log.info("Removed legacy unique return order index {}", name);
            }
        }
        mongoTemplate.indexOps(ReturnOrder.class).ensureIndex(
                new Index()
                        .on("orderId", Sort.Direction.ASC)
                        .on("createdAt", Sort.Direction.DESC)
                        .named("return_order_order_created_idx"));
    }
}
