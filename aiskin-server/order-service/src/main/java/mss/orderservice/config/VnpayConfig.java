// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "vnpay")
public class VnpayConfig {
    private String tmnCode;
    private String hashSecret;
    private String url;
    private String returnUrl;
    private String apiUrl;
}
