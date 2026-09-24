// com.fraudguard.security.JwtUtil
package com.fraudguard.security;

import com.fraudguard.config.JwtProperties;
import com.fraudguard.exception.InvalidTokenException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Objects;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * High-performance cryptographic utility for issuing and validating stateless JWT bearer tokens.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtUtil {

    private final JwtProperties jwtProperties;

    /**
     * Derives a cryptographic HMAC-SHA key from the configured signing secret.
     *
     * @return SecretKey suitable for JJWT signing and verification
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Issues a signed JWT bearer token containing user identity and granted role claims.
     *
     * @param userDetails authenticated user principal details
     * @return compact signed JWT string
     */
    public String generateToken(UserDetails userDetails) {
        Objects.requireNonNull(userDetails, "UserDetails principal cannot be null");
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtProperties.getExpiryMs());

        String authority = userDetails.getAuthorities().stream()
                .findFirst()
                .map(GrantedAuthority::getAuthority)
                .orElse("");

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("role", authority)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Verifies that the provided token has a valid signature, has not expired, and matches the user.
     *
     * @param token bearer token string
     * @param userDetails user principal to validate against
     * @return true if token is valid and belongs to the principal, false otherwise
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        if (token == null || userDetails == null) {
            return false;
        }
        try {
            String email = extractEmail(token);
            Date expiration = extractExpiration(token);
            boolean isSubjectMatching = Objects.equals(email, userDetails.getUsername());
            boolean isNotExpired = expiration.after(new Date());
            return isSubjectMatching && isNotExpired;
        } catch (InvalidTokenException exception) {
            log.warn("Token validation failed: {}", exception.getMessage());
            return false;
        }
    }

    /**
     * Extracts the subject email address from the token claims.
     *
     * @param token JWT token string
     * @return user email subject
     */
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Extracts the assigned authorization role claim from the token.
     *
     * @param token JWT token string
     * @return role authority claim string
     */
    public String extractRole(String token) {
        Object roleClaim = extractAllClaims(token).get("role");
        return roleClaim != null ? roleClaim.toString() : "";
    }

    /**
     * Extracts the expiration timestamp from the token claims.
     *
     * @param token JWT token string
     * @return expiration Date
     */
    public Date extractExpiration(String token) {
        return extractAllClaims(token).getExpiration();
    }

    /**
     * Parses and cryptographically verifies all claims contained in the signed JWT token.
     *
     * @param token JWT token string
     * @return Claims payload
     * @throws InvalidTokenException if token signature is invalid, expired, or malformed
     */
    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException exception) {
            log.warn("JWT token has expired: {}", exception.getMessage());
            throw new InvalidTokenException("JWT token has expired", exception);
        } catch (MalformedJwtException | UnsupportedJwtException | SecurityException exception) {
            log.warn("JWT cryptographic verification failed: {}", exception.getMessage());
            throw new InvalidTokenException("Invalid JWT token format or signature", exception);
        } catch (JwtException | IllegalArgumentException exception) {
            log.warn("Unable to parse JWT token: {}", exception.getMessage());
            throw new InvalidTokenException("Malformed or unparseable JWT token", exception);
        }
    }
}
