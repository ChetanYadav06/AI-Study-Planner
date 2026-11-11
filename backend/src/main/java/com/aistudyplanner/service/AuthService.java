package com.aistudyplanner.service;

import com.aistudyplanner.dto.AuthResponse;
import com.aistudyplanner.dto.LoginRequest;
import com.aistudyplanner.dto.RegisterRequest;
import com.aistudyplanner.dto.UserProfileResponse;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.UserRepository;
import com.aistudyplanner.security.JwtUtil;
import com.aistudyplanner.security.SlidingWindowRateLimiter;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final SlidingWindowRateLimiter rateLimiter;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtUtil jwtUtil,
                       SlidingWindowRateLimiter rateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.rateLimiter = rateLimiter;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is already registered.");
        }

        User user = new User(
                request.getName().trim(),
                email,
                passwordEncoder.encode(request.getPassword())
        );

        User savedUser = userRepository.save(user);
        String token = jwtUtil.generateToken(savedUser.getEmail());

        return new AuthResponse(
                token,
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail(),
                "Registration successful! Welcome to AI Study Planner."
        );
    }

    public AuthResponse login(LoginRequest request, String clientIp) {
        String email = request.getEmail().trim().toLowerCase();
        String rateLimitKey = "login_fail:" + email + ":" + (clientIp != null ? clientIp : "unknown");

        // 5 failed login attempts per 15 minutes window (900 seconds)
        // Check if rate limiter already has >= 5 recorded failures
        if (!rateLimiter.tryAcquire(rateLimitKey, 5, 900)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed login attempts. Please wait 15 minutes before trying again.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
            // On success, reset the failed attempt counter
            rateLimiter.reset(rateLimitKey);
        } catch (BadCredentialsException e) {
            // Permit consumed counts as a failed attempt
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User account not found."));

        String token = jwtUtil.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                "Login successful. Welcome back, " + user.getName() + "!"
        );
    }

    public AuthResponse login(LoginRequest request) {
        return login(request, "0.0.0.0");
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found."));

        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCreatedAt()
        );
    }
}
