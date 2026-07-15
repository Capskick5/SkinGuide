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

/**
 * Core authentication & account flows:
 * register, login, refresh, logout, email verification, forgot/reset password.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Duration AUTH_ATTEMPT_WINDOW = Duration.ofMinutes(15);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int MAX_OTP_REQUESTS = 3;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenStore refreshTokenStore;
    private final OtpStore otpStore;
    private final EmailService emailService;
    private final OtpProperties otpProperties;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final AuthRateLimiter authRateLimiter;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RefreshTokenStore refreshTokenStore,
                       OtpStore otpStore,
                       EmailService emailService,
                       OtpProperties otpProperties,
                       GoogleTokenVerifier googleTokenVerifier,
                       AuthRateLimiter authRateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenStore = refreshTokenStore;
        this.otpStore = otpStore;
        this.emailService = emailService;
        this.otpProperties = otpProperties;
        this.googleTokenVerifier = googleTokenVerifier;
        this.authRateLimiter = authRateLimiter;
    }

    /** Create a new account, send a verification OTP, and return tokens. */
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Email đã được sử dụng");
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .roles(new HashSet<>(Set.of("USER")))
                .isActive(true)
                .emailVerified(false)
                .build();
        // Deliver before persistence so an SMTP failure does not leave a new
        // account that cannot complete verification or be registered again.
        issueOtp(OtpStore.Purpose.EMAIL_VERIFICATION, email, "Xác thực email");

        user = userRepository.save(user);
        log.debug("Registered new user {}", user.getId());

        return issueTokens(user);
    }

    /** Validate credentials and return tokens. */
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        authRateLimiter.assertAllowed("login", email, MAX_FAILED_ATTEMPTS, AUTH_ATTEMPT_WINDOW);
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            authRateLimiter.recordFailure("login", email, AUTH_ATTEMPT_WINDOW);
            throw ApiException.unauthorized("Email hoặc mật khẩu không đúng");
        }
        if (!user.isActive()) {
            authRateLimiter.recordFailure("login", email, AUTH_ATTEMPT_WINDOW);
            throw ApiException.unauthorized("Tài khoản đã bị vô hiệu hóa");
        }

        authRateLimiter.clear("login", email);
        return issueTokens(user);
    }

    /** Rotate a refresh token and return a fresh token pair. */
    public AuthResponse refresh(String refreshToken) {
        String userId = refreshTokenStore.resolveUserId(refreshToken);
        if (userId == null) {
            throw ApiException.unauthorized("Refresh token không hợp lệ hoặc đã hết hạn");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Người dùng không tồn tại"));

        String newRefresh = refreshTokenStore.rotate(refreshToken, userId);
        String accessToken = jwtService.generateAccessToken(user);
        return AuthResponse.of(accessToken, newRefresh,
                jwtService.getAccessTokenTtlSeconds(), UserResponse.from(user));
    }

    /** Revoke a refresh token (logout). */
    public void logout(String refreshToken) {
        refreshTokenStore.revoke(refreshToken);
    }

    // ---------- Email verification ----------

    /** (Re)send an email-verification OTP. Always succeeds quietly if user exists. */
    public OtpResponse requestEmailVerification(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        authRateLimiter.consume("send-verification-otp", email, MAX_OTP_REQUESTS, AUTH_ATTEMPT_WINDOW);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.isEmailVerified()) {
            // Don't reveal account state.
            return new OtpResponse("Nếu email hợp lệ, mã xác thực đã được gửi", null);
        }
        String code = issueOtp(OtpStore.Purpose.EMAIL_VERIFICATION, email, "Xác thực email");
        return new OtpResponse("Mã xác thực đã được gửi", devOtp(code));
    }

    public void verifyEmail(VerifyEmailRequest request) {
        String email = normalizeEmail(request.email());
        authRateLimiter.assertAllowed("verify-email-otp", email, MAX_FAILED_ATTEMPTS, AUTH_ATTEMPT_WINDOW);
        if (!otpStore.verify(OtpStore.Purpose.EMAIL_VERIFICATION, email, request.otp())) {
            authRateLimiter.recordFailure("verify-email-otp", email, AUTH_ATTEMPT_WINDOW);
            throw ApiException.badRequest("Mã OTP không đúng hoặc đã hết hạn");
        }
        authRateLimiter.clear("verify-email-otp", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.notFound("Người dùng không tồn tại"));
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    // ---------- Forgot / reset password ----------

    public OtpResponse forgotPassword(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        authRateLimiter.consume("send-password-reset-otp", email, MAX_OTP_REQUESTS, AUTH_ATTEMPT_WINDOW);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Don't reveal whether the email exists.
            return new OtpResponse("Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi", null);
        }
        String code = issueOtp(OtpStore.Purpose.PASSWORD_RESET, email, "Đặt lại mật khẩu");
        return new OtpResponse("Mã đặt lại mật khẩu đã được gửi", devOtp(code));
    }

    public void resetPassword(ResetPasswordRequest request) {
        String email = normalizeEmail(request.email());
        authRateLimiter.assertAllowed("reset-password-otp", email, MAX_FAILED_ATTEMPTS, AUTH_ATTEMPT_WINDOW);
        if (!otpStore.verify(OtpStore.Purpose.PASSWORD_RESET, email, request.otp())) {
            authRateLimiter.recordFailure("reset-password-otp", email, AUTH_ATTEMPT_WINDOW);
            throw ApiException.badRequest("Mã OTP không đúng hoặc đã hết hạn");
        }
        authRateLimiter.clear("reset-password-otp", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.notFound("Người dùng không tồn tại"));
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        // Invalidate all existing sessions for safety.
        refreshTokenStore.revokeAllForUser(user.getId());
    }

    // ---------- helpers ----------

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenStore.issue(user.getId());
        return AuthResponse.of(accessToken, refreshToken,
                jwtService.getAccessTokenTtlSeconds(), UserResponse.from(user));
    }

    private String issueOtp(OtpStore.Purpose purpose, String email, String label) {
        String code = otpStore.generate(purpose, email);
        try {
            emailService.sendOtp(email, label, code);
        } catch (MailException ex) {
            log.error("Unable to deliver {} OTP through SMTP", purpose, ex);
            throw ApiException.serviceUnavailable(
                    "Không thể gửi mã OTP lúc này. Vui lòng thử lại sau.");
        }
        return code;
    }

    /** Only expose the OTP in responses when running in dev mode. */
    private String devOtp(String code) {
        return otpProperties.exposeInResponse() ? code : null;
    }

    public AuthResponse loginWithGoogle(String credential) {
        GoogleTokenVerifier.GoogleIdentity googleUser = googleTokenVerifier.verify(credential);
        String email = normalizeEmail(googleUser.email());
        if (email == null) {
            throw ApiException.badRequest("Không tìm thấy email từ tài khoản Google");
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .fullName(googleUser.name())
                    .roles(new HashSet<>(Set.of("USER")))
                    .isActive(true)
                    .emailVerified(true)
                    .build();
            log.info("Registered new user {} via Google login", email);
            return userRepository.save(newUser);
        });

        if (!user.isActive()) {
            throw ApiException.unauthorized("Tài khoản đã bị vô hiệu hóa");
        }

        return issueTokens(user);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
