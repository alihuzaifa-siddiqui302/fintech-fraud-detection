// com.fraudguard.engine.model.RuleResult
package com.fraudguard.engine.model;

import java.math.BigDecimal;

/**
 * Individual fraud heuristic evaluation outcome detailing points contributed, trigger status, and rationale.
 *
 * @param ruleCode canonical identifier of the evaluated rule
 * @param ruleName human-readable rule title
 * @param pointsApplied incremental risk weight applied if triggered (0 if untriggered)
 * @param reason diagnostic explanation of the trigger condition or pass state
 * @param observedValue observed numeric metric or transaction telemetry value
 * @param triggered whether the rule condition was breached
 */
public record RuleResult(
    String ruleCode,
    String ruleName,
    int pointsApplied,
    String reason,
    BigDecimal observedValue,
    boolean triggered
) {}
