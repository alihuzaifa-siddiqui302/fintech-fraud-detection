// com.fraudguard.dto.response.SarReportDto
package com.fraudguard.dto.response;

import java.time.LocalDateTime;

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
        LocalDateTime filedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
