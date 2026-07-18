package mss.userservice.service;

import mss.userservice.config.OtpProperties;
import mss.userservice.dto.AuthResponse;
import mss.userservice.dto.LoginRequest;
import mss.userservice.dto.RegisterRequest;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.security.AuthRateLimiter;
import mss.userservice.security.JwtService;
import mss.userservice.security.OtpStore;
import mss.userservice.security.RefreshTokenStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Duration;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import mss.userservice.security.IJwtService;

class AuthServiceTest {

    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;

    private IJwtService jwtService;

    private RefreshTokenStore refreshTokenStore;

    private OtpStore otpStore;

    private IEmailService emailService;

    private OtpProperties otpProperties;

    private GoogleTokenVerifier googleTokenVerifier;

    private AuthRateLimiter authRateLimiter;

    private IAuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = mock(JwtService.class);
        refreshTokenStore = mock(RefreshTokenStore.class);
        otpStore = mock(OtpStore.class);
        emailService = mock(EmailService.class);
        otpProperties = mock(OtpProperties.class);
        googleTokenVerifier = mock(GoogleTokenVerifier.class);
        authRateLimiter = mock(AuthRateLimiter.class);
        authService = new AuthService(userRepository, passwordEncoder, jwtService, refreshTokenStore, otpStore, emailService, otpProperties, googleTokenVerifier, authRateLimiter);
    }

    @Test
    void loginRecordsFailureForInvalidPassword() {
        User user = activeUser();
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", user.getPassword())).thenReturn(false);
        assertThatThrownBy(() -> authService.login(new LoginRequest(" User@Example.com ", "wrong-password"))).isInstanceOfSatisfying(mss.userservice.exception.ApiException.class, exception -> assertThat(exception.getStatus().value()).isEqualTo(401));
        verify(authRateLimiter).assertAllowed("login", "user@example.com", 5, Duration.ofMinutes(15));
        verify(authRateLimiter).recordFailure("login", "user@example.com", Duration.ofMinutes(15));
        verify(authRateLimiter, never()).clear("login", "user@example.com");
    }

    @Test
    void successfulLoginClearsFailuresAndIssuesTokens() {
        User user = activeUser();
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-password", user.getPassword())).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
        when(refreshTokenStore.issue(user.getId())).thenReturn("refresh-token");
        AuthResponse response = authService.login(new LoginRequest("user@example.com", "correct-password"));
        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        verify(authRateLimiter).clear("login", "user@example.com");
        verify(authRateLimiter, never()).recordFailure("login", "user@example.com", Duration.ofMinutes(15));
    }

    @Test
    void refreshRejectsDeactivatedAccountAndRevokesSessions() {
        User user = activeUser();
        user.setActive(false);
        when(refreshTokenStore.resolveUserId("refresh-token")).thenReturn(user.getId());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> authService.refresh("refresh-token")).isInstanceOfSatisfying(mss.userservice.exception.ApiException.class, exception -> assertThat(exception.getStatus().value()).isEqualTo(401));
        verify(refreshTokenStore).revokeAllForUser(user.getId());
        verify(refreshTokenStore, never()).rotate(any(), any());
        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void forgotPasswordConsumesOtpRequestBeforeLookingUpAccount() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        authService.forgotPassword(" Missing@Example.com ");
        verify(authRateLimiter).consume("send-password-reset-otp", "missing@example.com", 3, Duration.ofMinutes(15));
        verify(userRepository).findByEmail("missing@example.com");
    }

    @Test
    void registrationDoesNotPersistAccountWhenSmtpDeliveryFails() {
        when(userRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode("strong-password")).thenReturn("hashed-password");
        when(otpStore.generate(OtpStore.Purpose.EMAIL_VERIFICATION, "user@example.com")).thenReturn("123456");
        doThrow(new MailSendException("SMTP unavailable")).when(emailService).sendOtp("user@example.com", "Xác thực email", "123456");
        assertThatThrownBy(() -> authService.register(new RegisterRequest("user@example.com", "strong-password", "Test User"))).isInstanceOfSatisfying(mss.userservice.exception.ApiException.class, exception -> assertThat(exception.getStatus().value()).isEqualTo(503));
        verify(userRepository, never()).save(any(User.class));
    }

    private User activeUser() {
        return User.builder().id("user-1").email("user@example.com").password("hashed-password").fullName("Test User").isActive(true).build();
    }
}
