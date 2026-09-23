// com.fraudguard.dto.response.MetricsDto
package com.fraudguard.dto.response;

import java.math.BigDecimal;

/**
 * High-level system fraud KPIs and operational metrics snapshot.
 *
 * @param totalVolumeToday total monetary volume processed today
 * @param totalTransactionsToday total count of transactions evaluated today
 * @param blockedCount total count of automatically or manually blocked transactions
 * @param pendingCount total count of transactions currently awaiting review
 * @param approvedCount total count of approved transactions
 * @param autoBlockRate percentage string of automatically blocked transactions
 * @param averageRiskScore average risk score across today's transactions
 */
public record MetricsDto(
    BigDecimal totalVolumeToday,
    long totalTransactionsToday,
    long blockedCount,
    long pendingCount,
    long approvedCount,
    String autoBlockRate,
    double averageRiskScore
) {}
