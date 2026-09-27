// com.fraudguard.messaging.event.TransactionKafkaEvent
package com.fraudguard.messaging.event;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Immutable streaming event payload representing transaction evaluations and decisions over Kafka.
 *
 * @param transactionId unique transaction UUID
 * @param userId customer identifier
 * @param amount monetary value
 * @param currency ISO-4217 currency code
 * @param status decision status (APPROVED, PENDING_REVIEW, BLOCKED)
 * @param riskScore composite risk score (0-100)
 * @param ipAddress originating client IP address
 * @param ipCountry resolved geolocation country code
 * @param isVpn VPN endpoint detection indicator
 * @param isTor Tor exit node detection indicator
 * @param triggeredRuleCodes list of triggered fraud rule codes
 * @param createdAt timestamp of evaluation
 * @param eventType lifecycle event type ("TXN_SUBMITTED" or "TXN_DECIDED")
 */
public record TransactionKafkaEvent(
        String transactionId,
        String userId,
        BigDecimal amount,
        String currency,
        String status,
        int riskScore,
        String ipAddress,
        String ipCountry,
        boolean isVpn,
        boolean isTor,
        List<String> triggeredRuleCodes,
        OffsetDateTime createdAt,
        String eventType
) {}
