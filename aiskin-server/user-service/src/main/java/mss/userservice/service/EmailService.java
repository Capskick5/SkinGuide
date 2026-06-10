package mss.userservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Mock email sender for development.
 * Logs the message instead of sending. Replace with a real SMTP / provider
 * integration (e.g. spring-boot-starter-mail) in production.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    public void sendOtp(String to, String purpose, String code) {
        log.info("""
                ───────────── MOCK EMAIL ─────────────
                To      : {}
                Subject : [AiSkin] Mã xác thực ({})
                Body    : Mã OTP của bạn là {}. Mã có hiệu lực trong vài phút.
                ──────────────────────────────────────""", to, purpose, code);
    }
}
