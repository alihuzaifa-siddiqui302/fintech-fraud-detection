// com.fraudguard.repository.TransactionRepository
package com.fraudguard.repository;

import com.fraudguard.entity.Transaction;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access and analytical query operations for transactions and risk metrics.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {

    /**
     * Retrieves paginated transaction history for a specific customer ordered newest first.
     *
     * @param userId unique customer identity
     * @param pageable pagination parameters
     * @return Page of transactions
     */
    Page<Transaction> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    /**
     * Retrieves all global transactions ordered by creation timestamp descending.
     *
     * @param pageable pagination parameters
     * @return Page of all transactions
     */
    Page<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Retrieves transactions filtered by status (e.g. PENDING_REVIEW queue) ordered by creation timestamp descending.
     *
     * @param status adjudication status (APPROVED, PENDING_REVIEW, BLOCKED)
     * @param pageable pagination parameters
     * @return Page of filtered transactions
     */
    Page<Transaction> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    /**
     * Counts recent transactions submitted by a user within a sliding time window.
     *
     * @param userId customer identifier
     * @param after window boundary timestamp
     * @return count of transactions
     */
    long countByUserIdAndCreatedAtAfter(String userId, OffsetDateTime after);

    /**
     * Counts recent transactions originating from a specific IP address within a sliding window.
     *
     * @param ipAddress client IP address
     * @param after window boundary timestamp
     * @return count of transactions
     */
    long countByIpAddressAndCreatedAtAfter(String ipAddress, OffsetDateTime after);

    /**
     * Counts transactions having a specific adjudication status within a time period.
     *
     * @param status transaction status
     * @param after starting timestamp
     * @return count of matching transactions
     */
    long countByStatusAndCreatedAtAfter(String status, OffsetDateTime after);

    /**
     * Counts recent failed/blocked transactions for a user to identify brute-force card testing.
     *
     * @param userId customer identifier
     * @param status status to filter (e.g., BLOCKED)
     * @param after starting timestamp
     * @return count of matching transactions
     */
    long countByUserIdAndStatusAndCreatedAtAfter(String userId, String status, OffsetDateTime after);

    /**
     * Computes the total monetary transaction volume processed after a specified timestamp.
     *
     * @param after starting timestamp boundary
     * @return aggregated monetary sum
     */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.createdAt > :after")
    BigDecimal sumAmountAfter(@Param("after") OffsetDateTime after);

    /**
     * Computes the rolling average transaction amount for a customer within a historical window.
     *
     * @param userId customer identifier
     * @param after starting timestamp boundary
     * @return average transaction amount
     */
    @Query("SELECT COALESCE(AVG(t.amount), 0) FROM Transaction t WHERE t.userId = :userId AND t.createdAt > :after")
    BigDecimal averageAmountByUserAfter(@Param("userId") String userId, @Param("after") OffsetDateTime after);

    /**
     * Counts distinct customer accounts transacting through the same IP within a sliding timeframe.
     *
     * @param ip client IP address
     * @param after starting timestamp boundary
     * @return count of distinct user accounts
     */
    @Query("SELECT COUNT(DISTINCT t.userId) FROM Transaction t WHERE t.ipAddress = :ip AND t.createdAt > :after")
    long countDistinctUsersByIpAfter(@Param("ip") String ip, @Param("after") OffsetDateTime after);

    /**
     * Computes average risk score across all transactions evaluated within a given timeframe.
     *
     * @param after starting timestamp boundary
     * @return average composite risk score
     */
    @Query("SELECT COALESCE(AVG(t.riskScore), 0) FROM Transaction t WHERE t.createdAt > :after")
    double averageRiskScoreAfter(@Param("after") OffsetDateTime after);
}
