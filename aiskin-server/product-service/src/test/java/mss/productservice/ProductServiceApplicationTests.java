package mss.productservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"MONGODB_URI_PRODUCT=mongodb://localhost:27017/aiskin-product-test",
		"spring.data.mongodb.auto-index-creation=false",
		"KAFKA_BOOTSTRAP_SERVERS=localhost:9092",
		"PRODUCT_SERVICE_PORT=0",
		"UPLOAD_DIR=target/test-uploads",
		"JWT_SECRET=dGVzdC1zZWNyZXQta2V5LXdpdGgtMzItYnl0ZXMhISEh",
		"EUREKA_URI=http://localhost:8761/eureka/",
		"eureka.client.enabled=false"
})
class ProductServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
