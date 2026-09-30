// com.fraudguard.dto.response.OtpChallengeDto
package com.fraudguard.dto.response;

import java.time.OffsetDateTime;

/**
 * Public metadata representing an active 3DS OTP challenge sent to client checkout interfaces.
 * Never exposes the OTP hash or raw OTP value.
 */
public record OtpChallengeDto(
    String transactionId,
    String status,
    OffsetDateTime expiresAt,
    int maxAttempts,
    String maskedEmail,
    String message
) {}
