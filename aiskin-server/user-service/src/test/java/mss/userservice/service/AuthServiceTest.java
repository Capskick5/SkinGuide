package mss.userservice.service;

import mss.userservice.config.OtpProperties;
import mss.userservice.dto.AuthResponse;
import mss.userservice.model.Role;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.security.JwtService;
import mss.userservice.security.OtpStore;
import mss.userservice.security.RefreshTokenStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private RefreshTokenStore refreshTokenStore;
    private OtpStore otpStore;
    private EmailService emailService;
    private OtpProperties otpProperties;

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

        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                refreshTokenStore,
                otpStore,
                emailService,
                otpProperties
        );
    }

    @Test
    void testLoginWithGoogle_NewUser() {
        String mockToken = "mock-google-token-john.doe@example.com";
        
        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encodedPassword");
        
        User savedUser = User.builder()
                .id("user-123")
                .email("john.doe@example.com")
                .fullName("John.doe")
                .roles(Set.of(Role.USER))
                .isActive(true)
                .emailVerified(true)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        when(jwtService.generateAccessToken(any())).thenReturn("mockAccessToken");
        when(refreshTokenStore.issue(any())).thenReturn("mockRefreshToken");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);

        AuthResponse response = authService.loginWithGoogle(mockToken);

        assertNotNull(response);
        assertEquals("mockAccessToken", response.accessToken());
        assertEquals("mockRefreshToken", response.refreshToken());
        assertEquals("john.doe@example.com", response.user().email());
        assertEquals("John.doe", response.user().fullName());
        assertTrue(response.user().emailVerified());
        
        verify(userRepository).save(any(User.class));
    }

    @Test
    void testLoginWithGoogle_ExistingUser() {
        String mockToken = "mock-google-token-existing@example.com";
        
        User existingUser = User.builder()
                .id("user-456")
                .email("existing@example.com")
                .fullName("Existing User")
                .roles(Set.of(Role.USER))
                .isActive(true)
                .emailVerified(true)
                .build();
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(existingUser));
        
        when(jwtService.generateAccessToken(any())).thenReturn("mockAccessToken");
        when(refreshTokenStore.issue(any())).thenReturn("mockRefreshToken");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);

        AuthResponse response = authService.loginWithGoogle(mockToken);

        assertNotNull(response);
        assertEquals("mockAccessToken", response.accessToken());
        assertEquals("mockRefreshToken", response.refreshToken());
        assertEquals("existing@example.com", response.user().email());
        
        verify(userRepository, never()).save(any(User.class));
    }
}
