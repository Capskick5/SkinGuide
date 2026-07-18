package mss.userservice.service;

import mss.userservice.config.OtpProperties;
import mss.userservice.dto.*;
import mss.userservice.exception.ApiException;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.security.AuthRateLimiter;
import mss.userservice.security.JwtService;
import mss.userservice.security.OtpStore;
import mss.userservice.security.RefreshTokenStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public interface IAuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(String refreshToken);

    void logout(String refreshToken);

    OtpResponse requestEmailVerification(String rawEmail);

    void verifyEmail(VerifyEmailRequest request);

    OtpResponse forgotPassword(String rawEmail);

    void resetPassword(ResetPasswordRequest request);

    AuthResponse loginWithGoogle(String credential);
}
