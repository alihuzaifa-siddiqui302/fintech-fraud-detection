// com.fraudguard.repository.FraudRuleRepository
package com.fraudguard.repository;

import com.fraudguard.entity.FraudRule;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for fraud detection heuristic configurations.
 */
@Repository
public interface FraudRuleRepository extends JpaRepository<FraudRule, Long> {

    /**
     * Retrieves all actively enabled fraud rules sorted by descending risk weight for pipeline evaluation.
     *
     * @return List of active FraudRules prioritized by risk weight
     */
    List<FraudRule> findByIsEnabledTrueOrderByRiskWeightDesc();

    /**
     * Finds a fraud rule definition by its unique business rule code.
     *
     * @param ruleCode unique rule identifier string
     * @return Optional containing matched FraudRule or empty if not found
     */
    Optional<FraudRule> findByRuleCode(String ruleCode);

    /**
     * Retrieves all fraud rules sorted by risk weight descending for analyst rulebook configuration.
     *
     * @return List of all rules ordered by risk weight descending
     */
    List<FraudRule> findAllByOrderByRiskWeightDesc();
}

