package mss.userservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mail")
public record MailDeliveryProperties(
        boolean enabled,
        String from,
        String subjectPrefix,
        boolean logOtp
) {
    public MailDeliveryProperties {
        from = hasText(from) ? from.trim() : "no-reply@aiskin.local";
        subjectPrefix = hasText(subjectPrefix) ? subjectPrefix.trim() : "[AiSkin]";
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
