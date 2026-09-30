// com.fraudguard.repository.TransactionRepository
package com.fraudguard.repository;

import com.fraudguard.entity.Transaction;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
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

    /**
     * Counts all transactions created after a given timestamp.
     *
     * @param after starting timestamp boundary
     * @return count of transactions
     */
    long countByCreatedAtAfter(OffsetDateTime after);

    /**
     * Search transactions across IP address or transaction ID substring.
     *
     * @param search keyword matching IP address or transaction ID
     * @param pageable pagination parameters
     * @return Page of matching transactions
     */
    @Query("SELECT t FROM Transaction t WHERE " +
           "(LOWER(t.ipAddress) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(CAST(t.id AS string)) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY t.createdAt DESC")
    Page<Transaction> findBySearch(@Param("search") String search, Pageable pageable);

    /**
     * Search transactions filtered by status and matching IP address or transaction ID substring.
     *
     * @param status adjudication status filter (e.g. PENDING_REVIEW, BLOCKED, APPROVED)
     * @param search keyword matching IP address or transaction ID
     * @param pageable pagination parameters
     * @return Page of matching transactions
     */
    @Query("SELECT t FROM Transaction t WHERE " +
           "t.status = :status AND " +
           "(LOWER(t.ipAddress) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(CAST(t.id AS string)) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY t.createdAt DESC")
    Page<Transaction> findByStatusAndSearch(@Param("status") String status, @Param("search") String search, Pageable pageable);

    /**
     * Finds distinct user account identifiers associated with a given IP address since a cutoff time.
     */
    @Query("SELECT DISTINCT t.userId FROM Transaction t WHERE t.ipAddress = :ip AND t.createdAt > :after")
    List<String> findDistinctUserIdsByIp(@Param("ip") String ip, @Param("after") OffsetDateTime after);

    /**
     * Finds distinct IP addresses used by a specific user.
     */
    @Query("SELECT DISTINCT t.ipAddress FROM Transaction t WHERE t.userId = :userId")
    List<String> findDistinctIpsByUser(@Param("userId") String userId);

    /**
     * Finds distinct non-null device fingerprints used by a specific user.
     */
    @Query("SELECT DISTINCT t.deviceFingerprint FROM Transaction t WHERE t.userId = :userId AND t.deviceFingerprint IS NOT NULL")
    List<String> findDistinctFingerprintsByUser(@Param("userId") String userId);

    /**
     * Finds distinct user accounts that transacted from a given device fingerprint since a cutoff time.
     */
    @Query("SELECT DISTINCT t.userId FROM Transaction t WHERE t.deviceFingerprint = :fp AND t.createdAt > :after")
    List<String> findDistinctUserIdsByFingerprint(@Param("fp") String fp, @Param("after") OffsetDateTime after);

    /**
     * Computes the historical average risk score evaluated for a customer account.
     */
    @Query("SELECT COALESCE(AVG(t.riskScore), 0.0) FROM Transaction t WHERE t.userId = :userId")
    Double findAvgRiskScoreByUser(@Param("userId") String userId);

    /**
     * Counts the total transactions originating from a specific IP since a cutoff timestamp.
     */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.ipAddress = :ip AND t.createdAt > :after")
    long countByIpAfter(@Param("ip") String ip, @Param("after") OffsetDateTime after);

    /**
     * Retrieves suspicious transactions evaluated at or above a risk threshold for graph seeding.
     */
    @Query("SELECT t FROM Transaction t WHERE t.riskScore >= :minScore AND t.createdAt > :after ORDER BY t.createdAt DESC")
    List<Transaction> findSuspiciousSeedTransactions(@Param("minScore") int minScore, @Param("after") OffsetDateTime after, Pageable pageable);

    /**
     * Retrieves seed transactions for a specific user.
     */
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.createdAt > :after ORDER BY t.createdAt DESC")
    List<Transaction> findSeedTransactionsByUser(@Param("userId") String userId, @Param("after") OffsetDateTime after, Pageable pageable);

    /**
     * Retrieves seed transactions for a specific IP address.
     */
    @Query("SELECT t FROM Transaction t WHERE t.ipAddress = :ip AND t.createdAt > :after ORDER BY t.createdAt DESC")
    List<Transaction> findSeedTransactionsByIp(@Param("ip") String ip, @Param("after") OffsetDateTime after, Pageable pageable);

    /**
     * Retrieves seed transactions for a specific device fingerprint.
     */
    @Query("SELECT t FROM Transaction t WHERE t.deviceFingerprint = :fp AND t.createdAt > :after ORDER BY t.createdAt DESC")
    List<Transaction> findSeedTransactionsByFingerprint(@Param("fp") String fp, @Param("after") OffsetDateTime after, Pageable pageable);

    /**
     * Retrieves recent seed transactions when no specific filters or elevated scores match.
     */
    @Query("SELECT t FROM Transaction t WHERE t.createdAt > :after ORDER BY t.createdAt DESC")
    List<Transaction> findRecentSeedTransactions(@Param("after") OffsetDateTime after, Pageable pageable);
}

