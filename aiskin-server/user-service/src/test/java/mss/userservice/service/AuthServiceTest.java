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

}
