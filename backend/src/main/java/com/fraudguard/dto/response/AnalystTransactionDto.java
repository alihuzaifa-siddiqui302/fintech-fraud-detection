// com.fraudguard.dto.response.AnalystTransactionDto
package com.fraudguard.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Comprehensive transaction view for compliance analysts reviewing flagged queues.
 *
 * @param id transaction UUID
 * @param amount monetary value
 * @param currency ISO-4217 currency code
 * @param ipAddress client IP address
 * @param ipCountry geolocation country code
 * @param ipCity geolocation city
 * @param deviceFingerprint client device fingerprint hash
 * @param deviceType device category (desktop, mobile, tablet)
 * @param browser client browser
 * @param os client operating system
 * @param isVpn VPN endpoint flag
 * @param isTor Tor node flag
 * @param isProxy proxy server flag
 * @param isHostingIp hosting/datacenter IP flag
 * @param ipqsFraudScore external IPQS risk score
 * @param riskScore internal composite score
 * @param status adjudication status
 * @param statusColor badge color indicator
 * @param timeOnPageMs checkout page duration in milliseconds
 * @param pasteDetected clipboard paste detected
 * @param timezoneMismatch browser vs IP timezone discrepancy
 * @param isHeadless headless browser automation detected
 * @param triggeredRules detailed list of triggered fraud rules
 * @param reviewedByName name of analyst who resolved review
 * @param resolutionNotes manual review justification
 * @param createdAt creation timestamp
 */
public record AnalystTransactionDto(
    String id,
    BigDecimal amount,
    String currency,
    String ipAddress,
    String ipCountry,
    String ipCity,
    String deviceFingerprint,
    String deviceType,
    String browser,
    String os,
    Boolean isVpn,
    Boolean isTor,
    Boolean isProxy,
    Boolean isHostingIp,
    Integer ipqsFraudScore,
    Integer riskScore,
    String status,
    String statusColor,
    Long timeOnPageMs,
    Boolean pasteDetected,
    Boolean timezoneMismatch,
    Boolean isHeadless,
    List<RuleHitDto> triggeredRules,
    String reviewedByName,
    String resolutionNotes,
    OffsetDateTime createdAt
) {}
