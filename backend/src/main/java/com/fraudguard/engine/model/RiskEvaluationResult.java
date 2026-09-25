// com.fraudguard.engine.model.RiskEvaluationResult
package com.fraudguard.engine.model;

import java.util.Collections;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Composite risk adjudication outcome aggregating score, status decision, and rule breakdown.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskEvaluationResult {

    private int totalScore;
    private String status;
    private boolean instantBlock;
    private List<RuleResult> allResults;

    /**
     * Filters all evaluated results to return only rules that were triggered.
     *
     * @return List of triggered RuleResult instances
     */
    public List<RuleResult> getTriggeredRules() {
        if (allResults == null) {
            return Collections.emptyList();
        }
        return allResults.stream()
                .filter(RuleResult::triggered)
                .toList();
    }
}
