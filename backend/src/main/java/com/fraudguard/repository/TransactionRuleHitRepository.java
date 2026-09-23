// com.fraudguard.repository.TransactionRuleHitRepository
package com.fraudguard.repository;

import com.fraudguard.entity.TransactionRuleHit;
import com.fraudguard.entity.TransactionRuleHitId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for individual fraud rule trigger audits on transactions.
 */
@Repository
public interface TransactionRuleHitRepository extends JpaRepository<TransactionRuleHit, TransactionRuleHitId> {

    /**
     * Retrieves all detailed fraud rule hit records recorded for a given transaction.
     *
     * @param transactionId unique transaction identifier
     * @return List of rule hits detailing weight applied, observed telemetry, and trigger reason
     */
    List<TransactionRuleHit> findByTransactionId(String transactionId);
}
