package mss.orderservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "ghn")
public class GhnConfig {
    private String apiUrl = "https://dev-online-gateway.ghn.vn/shiip/public-api/v2";
    private String token;
    private String shopId;
    private String webhookSecret;
}
