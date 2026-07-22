package mss.apigateway;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
		"server.port=0",
		"eureka.client.enabled=false",
		"spring.cloud.discovery.enabled=false"
})
class ApiGatewayApplicationTests {

	@Test
	void contextLoads() {
	}

	@Test
	void routesVoucherRequestsToOrderService() throws IOException {
		try (var stream = getClass().getResourceAsStream("/application.yml")) {
			assertThat(stream).isNotNull();
			String configuration = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
			assertThat(configuration).contains("/api/vouchers/**");
		}
	}

}
