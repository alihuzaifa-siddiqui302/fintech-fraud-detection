// com.fraudguard.service.AuthService
package com.fraudguard.service;

import com.fraudguard.config.JwtProperties;
import com.fraudguard.dto.request.LoginRequest;
import com.fraudguard.dto.response.AuthResponse;
import com.fraudguard.entity.User;
import com.fraudguard.repository.UserRepository;
import com.fraudguard.security.CustomUserDetailsService.FraudGuardUserDetails;
import com.fraudguard.security.JwtUtil;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service orchestrating user credential verification, anti-brute-force throttling, and JWT token issuance.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final long BRUTE_FORCE_DELAY_MS = 300L;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;

    /**
     * Authenticates user credentials with constant-time delay mitigation and issues an authenticated session token.
     *
     * @param request login payload containing email and raw password
     * @param clientIp originating network IP address for security logging
     * @return AuthResponse containing bearer token, granted role, and expiration timestamp
     * @throws BadCredentialsException if authentication fails
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request, String clientIp) {
        Objects.requireNonNull(request, "LoginRequest cannot be null");
        String email = request.getEmail().trim().toLowerCase();

        Optional<User> userOptional = userRepository.findByEmail(email);

        boolean isPasswordValid = userOptional.isPresent() &&
                passwordEncoder.matches(request.getPassword(), userOptional.get().getPasswordHash());

        if (!isPasswordValid) {
            applyBruteForceMitigationDelay();
            log.warn("Failed login attempt: {} from IP {}", email, clientIp);
            throw new BadCredentialsException("Invalid email or password");
        }

        User authenticatedUser = userOptional.get();
        log.info("Successful login: {} role={}", email, authenticatedUser.getRole());

        FraudGuardUserDetails userDetails = new FraudGuardUserDetails(authenticatedUser);
        String token = jwtUtil.generateToken(userDetails);
        long expiresAt = System.currentTimeMillis() + jwtProperties.getExpiryMs();

        return new AuthResponse(
                token,
                authenticatedUser.getRole(),
                authenticatedUser.getEmail(),
                authenticatedUser.getName(),
                expiresAt
        );
    }

    /**
     * Introduces an artificial delay to slow down automated dictionary and credential stuffing attacks.
     */
    private void applyBruteForceMitigationDelay() {
        try {
            Thread.sleep(BRUTE_FORCE_DELAY_MS);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted while executing brute force delay: {}", interruptedException.getMessage());
        }
    }
}
