// com.fraudguard.security.JwtAuthFilter
package com.fraudguard.security;

import com.fraudguard.util.IpExtractor;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Intercepts inbound HTTP requests to validate bearer JWT tokens and populate the security context.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    public static final String ATTR_EXTRACTED_IP = "X-Extracted-IP";

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final IpExtractor ipExtractor;

    /**
     * Executes once per request filter logic for JWT authentication.
     *
     * @param request HTTP request
     * @param response HTTP response
     * @param filterChain security filter chain
     * @throws ServletException in case of servlet processing errors
     * @throws IOException in case of I/O errors
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            // 5. Store extracted IP in request attribute for downstream auditing and velocity checks
            String clientIp = ipExtractor.extractIp(request);
            request.setAttribute(ATTR_EXTRACTED_IP, clientIp);

            // 1. Extract Authorization header
            String authHeader = request.getHeader(AUTHORIZATION_HEADER);
            if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
                filterChain.doFilter(request, response);
                return;
            }

            // 2. Extract token string after "Bearer "
            String token = authHeader.substring(BEARER_PREFIX.length()).trim();

            // 3. Extract subject email from token
            String email = jwtUtil.extractEmail(token);

            // 4. Authenticate principal if email is present and security context is not already established
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                if (jwtUtil.isTokenValid(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authenticationToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                    log.debug("Successfully authenticated principal: {} with role: {}", email, userDetails.getAuthorities());
                } else {
                    log.warn("Provided JWT bearer token is invalid or expired for email: {}", email);
                }
            }
        } catch (Exception exception) {
            // 7. Never propagate unhandled filter exceptions to client — log warning and allow filter chain to proceed
            log.warn("Security filter encountered an error during JWT processing: {}", exception.getMessage());
        }

        // 6. Always proceed with remaining filter chain
        filterChain.doFilter(request, response);
    }
}
