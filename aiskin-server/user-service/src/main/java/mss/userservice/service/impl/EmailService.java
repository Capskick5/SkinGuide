// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.service.impl;

import jakarta.annotation.PostConstruct;
import mss.userservice.config.MailDeliveryProperties;
import mss.userservice.config.OtpProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import mss.userservice.service.*;

/**
 * Delivers authentication OTPs through SMTP in production. Local development
 * can disable SMTP only when the OTP is exposed in the API response.
 */
@Service
public class EmailService implements IEmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    private final MailDeliveryProperties properties;

    private final OtpProperties otpProperties;

    private final String smtpHost;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider, MailDeliveryProperties properties, OtpProperties otpProperties, @Value("${spring.mail.host:}") String smtpHost) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.properties = properties;
        this.otpProperties = otpProperties;
        this.smtpHost = smtpHost == null ? "" : smtpHost.trim();
    }

    @PostConstruct
    void validateConfiguration() {
        if (properties.enabled() && (mailSender == null || smtpHost.isBlank())) {
            throw new IllegalStateException("MAIL_ENABLED=true requires a configured SMTP_HOST");
        }
        if (!properties.enabled() && !otpProperties.exposeInResponse()) {
            throw new IllegalStateException("OTP delivery is unavailable: enable SMTP or set OTP_EXPOSE=true for local development");
        }
    }

    public void sendOtp(String to, String purpose, String code) {
        if (!properties.enabled()) {
            if (properties.logOtp()) {
                log.warn("Development OTP for {} ({}): {}", to, purpose, code);
            } else {
                log.debug("SMTP disabled; OTP is available through the development response for {}", to);
            }
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.from());
        message.setTo(to);
        message.setSubject(properties.subjectPrefix() + " Mã xác thực " + purpose);
        message.setText("Mã OTP của bạn là " + code + ". Mã chỉ sử dụng một lần và sẽ hết hiệu lực trong " + Math.max(1, otpProperties.ttlSeconds() / 60) + " phút.");
        mailSender.send(message);
        log.info("Sent {} OTP email to {}", purpose, to);
    }
}
