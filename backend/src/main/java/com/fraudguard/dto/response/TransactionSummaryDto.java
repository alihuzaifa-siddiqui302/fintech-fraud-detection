// com.fraudguard.dto.response.TransactionSummaryDto
package com.fraudguard.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Compact transaction summary representation for customer dashboard tables.
 *
 * @param id transaction UUID
 * @param amount monetary value
 * @param currency ISO-4217 currency
 * @param status decision status
 * @param statusColor badge styling indicator
 * @param riskScore composite risk score
 * @param createdAt creation timestamp
 */
public record TransactionSummaryDto(
    String id,
    BigDecimal amount,
    String currency,
    String status,
    String statusColor,
    int riskScore,
    OffsetDateTime createdAt
) {}
