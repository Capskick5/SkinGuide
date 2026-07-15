package mss.userservice.service;

import mss.userservice.config.OtpProperties;
import mss.userservice.dto.AuthResponse;
import mss.userservice.dto.LoginRequest;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.security.AuthRateLimiter;
import mss.userservice.security.JwtService;
import mss.userservice.security.OtpStore;
import mss.userservice.security.RefreshTokenStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private RefreshTokenStore refreshTokenStore;
    private OtpStore otpStore;
    private EmailService emailService;
    private OtpProperties otpProperties;
    private GoogleTokenVerifier googleTokenVerifier;
    private AuthRateLimiter authRateLimiter;

    private AuthService authService;

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

        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                refreshTokenStore,
                otpStore,
                emailService,
                otpProperties,
                googleTokenVerifier,
                authRateLimiter
        );
    }

    @Test
    void loginRecordsFailureForInvalidPassword() {
        User user = activeUser();
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", user.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(
                new LoginRequest(" User@Example.com ", "wrong-password")))
                .isInstanceOfSatisfying(mss.userservice.exception.ApiException.class,
                        exception -> assertThat(exception.getStatus().value()).isEqualTo(401));

        verify(authRateLimiter).assertAllowed(
                "login", "user@example.com", 5, Duration.ofMinutes(15));
        verify(authRateLimiter).recordFailure(
                "login", "user@example.com", Duration.ofMinutes(15));
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

        AuthResponse response = authService.login(
                new LoginRequest("user@example.com", "correct-password"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        verify(authRateLimiter).clear("login", "user@example.com");
        verify(authRateLimiter, never()).recordFailure(
                "login", "user@example.com", Duration.ofMinutes(15));
    }

    @Test
    void forgotPasswordConsumesOtpRequestBeforeLookingUpAccount() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        authService.forgotPassword(" Missing@Example.com ");

        verify(authRateLimiter).consume(
                "send-password-reset-otp", "missing@example.com", 3, Duration.ofMinutes(15));
        verify(userRepository).findByEmail("missing@example.com");
    }

    private User activeUser() {
        return User.builder()
                .id("user-1")
                .email("user@example.com")
                .password("hashed-password")
                .fullName("Test User")
                .isActive(true)
                .build();
    }
}
