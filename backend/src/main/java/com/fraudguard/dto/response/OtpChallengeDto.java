// com.fraudguard.dto.response.OtpChallengeDto
package com.fraudguard.dto.response;

import java.time.LocalDateTime;

/**
 * Public metadata representing an active 3DS OTP challenge sent to client checkout interfaces.
 * Never exposes the OTP hash or raw OTP value.
 */
public record OtpChallengeDto(
    String transactionId,
    String status,
    LocalDateTime expiresAt,
    int maxAttempts,
    String maskedEmail,
    String message,
    String demoOtp
) {
    public OtpChallengeDto(
            String transactionId,
            String status,
            LocalDateTime expiresAt,
            int maxAttempts,
            String maskedEmail,
            String message
    ) {
        this(transactionId, status, expiresAt, maxAttempts, maskedEmail, message, null);
    }
}
