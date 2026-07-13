package mss.userservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"server.port=0",
		"eureka.client.enabled=false",
		"spring.mongodb.uri=mongodb://localhost:27017/aiskin-user-test?serverSelectionTimeoutMS=500",
		"spring.data.mongodb.auto-index-creation=false",
		"spring.data.redis.host=localhost",
		"spring.data.redis.port=6379",
		"app.jwt.secret=dGVzdC1vbmx5LXNlY3JldC1tdXN0LWJlLWF0LWxlYXN0LTMyLWJ5dGVz",
		"app.jwt.access-token-ttl-seconds=900",
		"app.jwt.refresh-token-ttl-seconds=3600",
		"app.otp.ttl-seconds=300",
		"app.otp.expose-in-response=true",
		"app.google.client-id=test-client",
		"app.google.client-secret=test-secret"
})
class UserServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
