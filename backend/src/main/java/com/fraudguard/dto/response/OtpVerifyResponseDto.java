// com.fraudguard.dto.response.OtpVerifyResponseDto
package com.fraudguard.dto.response;

/**
 * Result returned upon verifying a submitted OTP code.
 */
public record OtpVerifyResponseDto(
    boolean success,
    String transactionStatus,
    String otpStatus,
    int remainingAttempts,
    String message,
    String redirectHint
) {}
