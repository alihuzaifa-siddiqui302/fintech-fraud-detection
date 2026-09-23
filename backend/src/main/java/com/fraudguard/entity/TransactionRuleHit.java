// com.fraudguard.entity.TransactionRuleHit
package com.fraudguard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Audit record of an individual fraud detection rule triggered during transaction evaluation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "transaction_rule_hits")
@IdClass(TransactionRuleHitId.class)
public class TransactionRuleHit {

    @Id
    @Column(name = "transaction_id", columnDefinition = "uuid", nullable = false)
    private String transactionId;

    @Id
    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Column(name = "weight_applied", nullable = false)
    private Integer weightApplied;

    @Column(name = "observed_value", precision = 15, scale = 2)
    private BigDecimal observedValue;

    @Column(name = "trigger_reason", columnDefinition = "text")
    private String triggerReason;
}
