package mss.orderservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "momo")
public class MomoConfig {
    private String endpoint;
    private String partnerCode;
    private String accessKey;
    private String secretKey;
    private String returnUrl;
    private String notifyUrl;
}
