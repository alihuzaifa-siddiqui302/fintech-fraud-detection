// com.fraudguard.entity.TransactionRuleHitId
package com.fraudguard.entity;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Composite identifier class for TransactionRuleHit entity.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionRuleHitId implements Serializable {

    private String transactionId;
    private Long ruleId;
}
