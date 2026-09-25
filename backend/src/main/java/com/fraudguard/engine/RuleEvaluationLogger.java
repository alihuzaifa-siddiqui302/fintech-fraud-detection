// com.fraudguard.engine.RuleEvaluationLogger
package com.fraudguard.engine;

import com.fraudguard.engine.model.EnrichedTransactionContext;
import com.fraudguard.engine.model.RiskEvaluationResult;
import com.fraudguard.engine.model.RuleResult;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Audit logger providing structured, compliance-grade telemetry output for transaction evaluations.
 */
@Slf4j
@Component
public class RuleEvaluationLogger {

    /**
     * Emits structured summary logs at INFO level and detailed rule breakdowns at DEBUG level.
     *
     * @param ctx transaction context carrying request and telemetry signals
     * @param result completed risk evaluation outcome
     */
    public void logEvaluation(EnrichedTransactionContext ctx, RiskEvaluationResult result) {
        if (ctx == null || result == null) {
            return;
        }

        String triggeredRuleCodes = result.getTriggeredRules().stream()
                .map(RuleResult::ruleCode)
                .collect(Collectors.joining(", "));

        log.info("FRAUD_EVAL | user={} | ip={} | amount={} | score={} | status={} | triggered=[{}]",
                ctx.getUserId(),
                ctx.getResolvedIpAddress(),
                ctx.getAmount(),
                result.getTotalScore(),
                result.getStatus(),
                triggeredRuleCodes);

        if (log.isDebugEnabled() && result.getAllResults() != null) {
            for (RuleResult ruleResult : result.getAllResults()) {
                log.debug("RULE_DETAIL | code={} | triggered={} | weight={} | observed={} | reason={}",
                        ruleResult.ruleCode(),
                        ruleResult.triggered(),
                        ruleResult.pointsApplied(),
                        ruleResult.observedValue(),
                        ruleResult.reason());
            }
        }
    }
}
