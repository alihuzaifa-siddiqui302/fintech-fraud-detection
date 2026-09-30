// com.fraudguard.repository.OtpChallengeRepository
package com.fraudguard.repository;

import com.fraudguard.entity.OtpChallenge;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for managing OtpChallenge entities and derived state lookups.
 */
@Repository
public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, String> {

    /**
     * Finds active OTP challenge for a given transaction matching status (e.g. PENDING).
     */
    Optional<OtpChallenge> findByTransactionIdAndStatus(String transactionId, String status);

    /**
     * Finds any OTP record for a given transaction identifier.
     */
    Optional<OtpChallenge> findByTransactionId(String transactionId);

    /**
     * Finds expired pending OTP records for scheduled background cleanup.
     */
    List<OtpChallenge> findByStatusAndExpiresAtBefore(String status, OffsetDateTime now);
}
