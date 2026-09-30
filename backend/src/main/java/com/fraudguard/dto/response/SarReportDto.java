// com.fraudguard.dto.response.SarReportDto
package com.fraudguard.dto.response;

import java.time.OffsetDateTime;

/**
 * Data transfer representation of an AI Suspicious Activity Report.
 */
public record SarReportDto(
        String id,
        String transactionId,
        String reportText,
        String modelUsed,
        Integer promptTokenCount,
        Integer outputTokenCount,
        Long generationMs,
        String status,
        String generatedByEmail,
        String filedByEmail,
        OffsetDateTime filedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
