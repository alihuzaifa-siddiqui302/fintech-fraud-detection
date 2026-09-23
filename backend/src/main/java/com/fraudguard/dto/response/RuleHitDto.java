// com.fraudguard.dto.response.RuleHitDto
package com.fraudguard.dto.response;

import java.math.BigDecimal;

/**
 * Breakdown of an individual fraud rule triggered during risk evaluation.
 *
 * @param ruleCode unique code of the triggered rule
 * @param ruleName human-readable name of the rule
 * @param pointsApplied incremental risk weight contributed
 * @param reason contextual explanation of why the threshold was breached
 * @param observedValue observed numeric or telemetry metric
 */
public record RuleHitDto(
    String ruleCode,
    String ruleName,
    int pointsApplied,
    String reason,
    BigDecimal observedValue
) {}
