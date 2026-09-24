// com.fraudguard.controller.AuthController
package com.fraudguard.controller;

import com.fraudguard.dto.request.LoginRequest;
import com.fraudguard.dto.response.AuthResponse;
import com.fraudguard.security.JwtAuthFilter;
import com.fraudguard.service.AuthService;
import com.fraudguard.util.IpExtractor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public REST endpoint handling user authentication and token exchange.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final IpExtractor ipExtractor;

    /**
     * Authenticates credentials and returns a signed stateless JWT bearer token.
     *
     * @param request validated login credentials payload
     * @param servletRequest raw HTTP servlet request for client IP resolution
     * @return ResponseEntity containing AuthResponse payload
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = (String) servletRequest.getAttribute(JwtAuthFilter.ATTR_EXTRACTED_IP);
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = ipExtractor.extractIp(servletRequest);
        }

        log.debug("Processing login authentication request from IP: {}", clientIp);
        AuthResponse authResponse = authService.login(request, clientIp);
        return ResponseEntity.ok(authResponse);
    }
}
