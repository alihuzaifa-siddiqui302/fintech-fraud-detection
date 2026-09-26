// com.fraudguard.repository.SessionSignalRepository
package com.fraudguard.repository;

import com.fraudguard.entity.SessionSignal;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for granular client-side session behavioral telemetry.
 */
@Repository
public interface SessionSignalRepository extends JpaRepository<SessionSignal, Long> {

    /**
     * Finds session behavioral telemetry signals recorded for a given transaction.
     *
     * @param transactionId unique transaction identifier
     * @return Optional containing matched SessionSignal or empty
     */
    Optional<SessionSignal> findByTransactionId(String transactionId);
}
