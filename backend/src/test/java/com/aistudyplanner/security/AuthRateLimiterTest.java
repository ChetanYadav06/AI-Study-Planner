package com.aistudyplanner.security;

import com.aistudyplanner.dto.LoginRequest;
import com.aistudyplanner.repository.UserRepository;
import com.aistudyplanner.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthRateLimiterTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtil jwtUtil;

    private SlidingWindowRateLimiter rateLimiter;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        rateLimiter = new SlidingWindowRateLimiter();
        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtUtil, rateLimiter);
    }

    @Test
    void testFailedLoginAttemptLimiter() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        LoginRequest req = new LoginRequest();
        req.setEmail("attacker@target.com");
        req.setPassword("wrongpass");

        // First 5 attempts fail with 401 UNAUTHORIZED
        for (int i = 0; i < 5; i++) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> authService.login(req, "1.2.3.4"));
            assertEquals(401, ex.getStatusCode().value());
        }

        // 6th attempt is blocked by rate limiter with 429 TOO_MANY_REQUESTS
        ResponseStatusException blockedEx = assertThrows(ResponseStatusException.class, () -> authService.login(req, "1.2.3.4"));
        assertEquals(429, blockedEx.getStatusCode().value());
        assertTrue(blockedEx.getReason().contains("Too many failed login attempts"));
    }
}

