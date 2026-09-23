// com.fraudguard.repository.TransactionBlacklistHitRepository
package com.fraudguard.repository;

import com.fraudguard.entity.TransactionBlacklistHit;
import com.fraudguard.entity.TransactionBlacklistHitId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for tracking blacklist entries that triggered transaction blocks.
 */
@Repository
public interface TransactionBlacklistHitRepository extends JpaRepository<TransactionBlacklistHit, TransactionBlacklistHitId> {

    /**
     * Retrieves blacklist hit associations for a blocked transaction.
     *
     * @param transactionId unique transaction identifier
     * @return List of blacklist hit records
     */
    List<TransactionBlacklistHit> findByTransactionId(String transactionId);
}
