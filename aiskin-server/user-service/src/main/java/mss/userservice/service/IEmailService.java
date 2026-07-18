package mss.userservice.service;

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

public interface IEmailService {

    void sendOtp(String to, String purpose, String code);
}
