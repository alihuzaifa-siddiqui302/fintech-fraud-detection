// com.fraudguard.dto.response.CheckoutResponse
package com.fraudguard.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Immediate synchronous checkout adjudication response returned to client applications.
 *
 * @param transactionId       unique generated transaction identifier
 * @param status              adjudication decision (APPROVED, PENDING_REVIEW, BLOCKED, OTP_REQUIRED)
 * @param riskScore           composite score between 0 and 100
 * @param statusColor         UI badge color code (e.g. green, amber, red)
 * @param statusMessage       user-facing explanation message
 * @param triggeredRules      list of specific rule hits contributing to score
 * @param totalRulesEvaluated total number of heuristics inspected
 * @param timestamp           evaluation completion timestamp
 * @param otpTransactionId    transaction ID for OTP submission (non-null when status=OTP_REQUIRED)
 * @param demoOtp             plaintext OTP for demo/dev environments (null in production)
 * @param maskedEmail         masked destination email shown in OTP modal (non-null when status=OTP_REQUIRED)
 * @param expiresAt           OTP expiry timestamp (non-null when status=OTP_REQUIRED)
 */
public record CheckoutResponse(
    String transactionId,
    String status,
    int riskScore,
    String statusColor,
    String statusMessage,
    List<RuleHitDto> triggeredRules,
    int totalRulesEvaluated,
    OffsetDateTime timestamp,
    String otpTransactionId,
    String demoOtp,
    String maskedEmail,
    OffsetDateTime expiresAt
) {
    /**
     * Convenience constructor for non-OTP responses (APPROVED / BLOCKED / PENDING_REVIEW).
     * OTP-specific fields default to null.
     */
    public CheckoutResponse(
        String transactionId,
        String status,
        int riskScore,
        String statusColor,
        String statusMessage,
        List<RuleHitDto> triggeredRules,
        int totalRulesEvaluated,
        OffsetDateTime timestamp
    ) {
        this(transactionId, status, riskScore, statusColor, statusMessage,
             triggeredRules, totalRulesEvaluated, timestamp, null, null, null, null);
    }
}
