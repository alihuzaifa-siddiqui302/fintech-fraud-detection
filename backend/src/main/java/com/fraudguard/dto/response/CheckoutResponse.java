// com.fraudguard.dto.response.CheckoutResponse
package com.fraudguard.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Immediate synchronous checkout adjudication response returned to client applications.
 *
 * @param transactionId unique generated transaction identifier
 * @param status adjudication decision (APPROVED, PENDING_REVIEW, BLOCKED)
 * @param riskScore composite score between 0 and 100
 * @param statusColor UI badge color code (e.g. green, amber, red)
 * @param statusMessage user-facing explanation message
 * @param triggeredRules list of specific rule hits contributing to score
 * @param totalRulesEvaluated total number of heuristics inspected
 * @param timestamp evaluation completion timestamp
 */
public record CheckoutResponse(
    String transactionId,
    String status,
    int riskScore,
    String statusColor,
    String statusMessage,
    List<RuleHitDto> triggeredRules,
    int totalRulesEvaluated,
    OffsetDateTime timestamp
) {}
