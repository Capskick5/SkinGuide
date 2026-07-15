package mss.userservice;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import mss.userservice.config.JwtProperties;
import mss.userservice.config.MailDeliveryProperties;
import mss.userservice.config.OtpProperties;
import mss.userservice.config.GoogleOAuthProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
		JwtProperties.class,
		OtpProperties.class,
		GoogleOAuthProperties.class,
		MailDeliveryProperties.class
})
@OpenAPIDefinition(info = @Info(title = "AiSkin User Service API", version = "v1",
        description = "Authentication & user management for the AiSkin platform"))
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class UserServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(UserServiceApplication.class, args);
	}

}
