// com.fraudguard.dto.response.FraudRuleDto
package com.fraudguard.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Representation of a fraud detection rule for configuration management.
 *
 * @param id database primary key
 * @param ruleCode unique rule code string
 * @param name human-readable name
 * @param description detailed heuristic description
 * @param thresholdValue current numeric evaluation threshold
 * @param riskWeight risk point contribution (0-100)
 * @param isEnabled whether the rule actively evaluates transactions
 * @param updatedAt timestamp of latest configuration change
 */
public record FraudRuleDto(
    Long id,
    String ruleCode,
    String name,
    String description,
    BigDecimal thresholdValue,
    int riskWeight,
    boolean isEnabled,
    OffsetDateTime updatedAt
) {}
