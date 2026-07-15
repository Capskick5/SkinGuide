package mss.userservice.service;

import mss.userservice.config.MailDeliveryProperties;
import mss.userservice.config.OtpProperties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailServiceTest {

    @Test
    void sendsOtpThroughConfiguredSmtp() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailService service = service(sender, true, false, "smtp.example.com");
        service.validateConfiguration();

        service.sendOtp("user@example.com", "Xác thực email", "123456");

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(messageCaptor.capture());
        SimpleMailMessage message = messageCaptor.getValue();
        assertThat(message.getTo()).containsExactly("user@example.com");
        assertThat(message.getFrom()).isEqualTo("no-reply@example.com");
        assertThat(message.getSubject()).contains("AiSkin", "Xác thực email");
        assertThat(message.getText()).contains("123456", "5 phút");
    }

    @Test
    void localModeDoesNotContactSmtpWhenOtpIsExposed() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailService service = service(sender, false, true, "localhost");
        service.validateConfiguration();

        service.sendOtp("user@example.com", "Đặt lại mật khẩu", "654321");

        verify(sender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void rejectsConfigurationWithoutAnyOtpDeliveryChannel() {
        EmailService service = service(null, false, false, "");

        assertThatThrownBy(service::validateConfiguration)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("OTP delivery is unavailable");
    }

    @Test
    void rejectsEnabledSmtpWithoutSenderOrHost() {
        EmailService service = service(null, true, false, "");

        assertThatThrownBy(service::validateConfiguration)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SMTP_HOST");
    }

    @SuppressWarnings("unchecked")
    private EmailService service(JavaMailSender sender, boolean enabled,
                                 boolean exposeOtp, String smtpHost) {
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        MailDeliveryProperties mailProperties = new MailDeliveryProperties(
                enabled, "no-reply@example.com", "[AiSkin]", false);
        OtpProperties otpProperties = new OtpProperties(300, 6, exposeOtp);
        return new EmailService(provider, mailProperties, otpProperties, smtpHost);
    }
}
