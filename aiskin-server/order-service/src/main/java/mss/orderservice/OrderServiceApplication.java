// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import mss.orderservice.config.JwtProperties;

@SpringBootApplication

@EnableMongoAuditing
@EnableScheduling
@EnableConfigurationProperties(JwtProperties.class)
@OpenAPIDefinition(
        servers = {@Server(url = "/", description = "Default Server URL")},
        security = {@SecurityRequirement(name = "bearerAuth")}
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT"
)
public class OrderServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }

}
