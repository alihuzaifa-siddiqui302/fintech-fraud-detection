// com.fraudguard.dto.response.AuthResponse
package com.fraudguard.dto.response;

/**
 * Authentication response conveying the issued JWT bearer token and user metadata.
 *
 * @param token stateless JWT bearer token string
 * @param role assigned authorization role (e.g. ROLE_CUSTOMER, ROLE_ANALYST)
 * @param email user login email
 * @param name user full display name
 * @param expiresAt token expiration timestamp in epoch milliseconds
 */
public record AuthResponse(
    String token,
    String role,
    String email,
    String name,
    long expiresAt
) {}
