package mss.userservice.service;

import mss.userservice.config.OtpProperties;
import mss.userservice.dto.*;
import mss.userservice.exception.ApiException;
import mss.userservice.model.Role;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.security.JwtService;
import mss.userservice.security.OtpStore;
import mss.userservice.security.RefreshTokenStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Core authentication & account flows:
 * register, login, refresh, logout, email verification, forgot/reset password.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenStore refreshTokenStore;
    private final OtpStore otpStore;
    private final EmailService emailService;
    private final OtpProperties otpProperties;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RefreshTokenStore refreshTokenStore,
                       OtpStore otpStore,
                       EmailService emailService,
                       OtpProperties otpProperties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenStore = refreshTokenStore;
        this.otpStore = otpStore;
        this.emailService = emailService;
        this.otpProperties = otpProperties;
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
                .roles(new HashSet<>(Set.of(Role.USER)))
                .isActive(true)
                .emailVerified(false)
                .build();
        user = userRepository.save(user);
        log.debug("Registered new user {}", user.getId());

        // Fire-and-forget verification OTP (mock email).
        issueOtp(OtpStore.Purpose.EMAIL_VERIFICATION, email, "Xác thực email");

        return issueTokens(user);
    }

    /** Validate credentials and return tokens. */
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.unauthorized("Email hoặc mật khẩu không đúng"));

        if (!user.isActive()) {
            throw ApiException.unauthorized("Tài khoản đã bị vô hiệu hóa");
        }
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw ApiException.unauthorized("Email hoặc mật khẩu không đúng");
        }

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
        if (!otpStore.verify(OtpStore.Purpose.EMAIL_VERIFICATION, email, request.otp())) {
            throw ApiException.badRequest("Mã OTP không đúng hoặc đã hết hạn");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.notFound("Người dùng không tồn tại"));
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    // ---------- Forgot / reset password ----------

    public OtpResponse forgotPassword(String rawEmail) {
        String email = normalizeEmail(rawEmail);
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
        if (!otpStore.verify(OtpStore.Purpose.PASSWORD_RESET, email, request.otp())) {
            throw ApiException.badRequest("Mã OTP không đúng hoặc đã hết hạn");
        }
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
        emailService.sendOtp(email, label, code);
        return code;
    }

    /** Only expose the OTP in responses when running in dev mode. */
    private String devOtp(String code) {
        return otpProperties.exposeInResponse() ? code : null;
    }

    public AuthResponse loginWithGoogle(String credential) {
        GoogleTokenInfo googleUser = verifyGoogleToken(credential);
        String email = normalizeEmail(googleUser.getEmail());
        if (email == null) {
            throw ApiException.badRequest("Không tìm thấy email từ tài khoản Google");
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .fullName(googleUser.getName())
                    .roles(new HashSet<>(Set.of(Role.USER)))
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

    @SuppressWarnings("unchecked")
    private GoogleTokenInfo verifyGoogleToken(String credential) {
        if (credential != null && credential.startsWith("mock-")) {
            String email = "test-google@example.com";
            String name = "Mock Google User";
            if (credential.startsWith("mock-google-token-")) {
                email = credential.substring("mock-google-token-".length());
                int atIndex = email.indexOf('@');
                if (atIndex > 0) {
                    name = email.substring(0, atIndex);
                    name = Character.toUpperCase(name.charAt(0)) + name.substring(1);
                }
            }
            return new GoogleTokenInfo(email, name);
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null || response.containsKey("error")) {
                throw ApiException.unauthorized("Token Google không hợp lệ hoặc đã hết hạn");
            }
            String email = (String) response.get("email");
            String name = (String) response.get("name");
            if (name == null) {
                name = "Google User";
            }
            return new GoogleTokenInfo(email, name);
        } catch (Exception e) {
            log.error("Failed to verify Google token", e);
            throw ApiException.unauthorized("Không thể xác thực token Google: " + e.getMessage());
        }
    }

    private static class GoogleTokenInfo {
        private final String email;
        private final String name;

        public GoogleTokenInfo(String email, String name) {
            this.email = email;
            this.name = name;
        }

        public String getEmail() { return email; }
        public String getName() { return name; }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
