// com.fraudguard.config.SecurityConfig
package com.fraudguard.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.dto.response.ErrorResponse;
import com.fraudguard.security.CustomUserDetailsService;
import com.fraudguard.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Enterprise Spring Security configuration establishing stateless JWT authentication and RBAC authorization policies.
 */
@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;
    private final ObjectMapper objectMapper;

    @Value("${fraudguard.cors.allowed-origins:http://localhost:5173}")
    private String allowedOriginsConfig;

    /**
     * Configures the HTTP security filter chain, authorization rules, and stateless session policy.
     *
     * @param http HttpSecurity builder
     * @return constructed SecurityFilterChain
     * @throws Exception in case of configuration errors
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(corsCustomizer -> corsCustomizer.configurationSource(corsConfigurationSource()))
                .sessionManagement(sessionCustomizer ->
                        sessionCustomizer.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(authCustomizer -> authCustomizer
                        // Public endpoints
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/info").permitAll()
                        // Role-based authorization rules
                        .requestMatchers(HttpMethod.POST, "/api/v1/checkout/**").hasAuthority("ROLE_CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/customer/**").hasAuthority("ROLE_CUSTOMER")
                        .requestMatchers("/api/v1/analyst/**").hasAuthority("ROLE_ANALYST")
                        // Default strict rule: all other requests require authentication
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(exceptionCustomizer -> exceptionCustomizer
                        .authenticationEntryPoint(customAuthenticationEntryPoint())
                        .accessDeniedHandler(customAccessDeniedHandler())
                )
                .build();
    }

    /**
     * Configures CORS policy permitting authorized frontend clients.
     *
     * @return CorsConfigurationSource bean
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOriginsConfig.split(","))
                .map(String::trim)
                .toList();

        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-Forwarded-For",
                "X-Requested-With",
                "Accept"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Password encoder bean utilizing BCrypt with work factor cost 12.
     *
     * @return BCryptPasswordEncoder
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Configures DAO authentication provider with CustomUserDetailsService and BCrypt encoder.
     *
     * @return AuthenticationProvider bean
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Exposes AuthenticationManager from Spring Security configuration.
     *
     * @param configuration AuthenticationConfiguration
     * @return AuthenticationManager
     * @throws Exception in case of retrieval error
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    /**
     * Custom entry point returning RFC-compliant 401 JSON when unauthenticated requests fail.
     *
     * @return AuthenticationEntryPoint
     */
    private AuthenticationEntryPoint customAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            log.warn("Unauthorized request intercepted at: {}: {}", request.getRequestURI(), authException.getMessage());
            writeJsonResponse(
                    response,
                    HttpStatus.UNAUTHORIZED,
                    "UNAUTHORIZED",
                    "Full authentication is required to access this resource",
                    request.getRequestURI()
            );
        };
    }

    /**
     * Custom handler returning RFC-compliant 403 JSON when authorized principals lack necessary permissions.
     *
     * @return AccessDeniedHandler
     */
    private AccessDeniedHandler customAccessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            log.warn("Forbidden access attempt at: {}: {}", request.getRequestURI(), accessDeniedException.getMessage());
            writeJsonResponse(
                    response,
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Access is denied: insufficient role privileges for this operation",
                    request.getRequestURI()
            );
        };
    }

    /**
     * Writes standardized JSON ErrorResponse payload to HTTP servlet response.
     */
    private void writeJsonResponse(
            HttpServletResponse response,
            HttpStatus status,
            String error,
            String message,
            String path
    ) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse errorResponse = new ErrorResponse(
                error,
                message,
                status.value(),
                Instant.now(),
                path
        );
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
