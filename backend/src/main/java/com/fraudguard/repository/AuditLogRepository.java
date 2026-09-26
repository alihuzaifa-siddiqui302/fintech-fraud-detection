// com.fraudguard.repository.AuditLogRepository
package com.fraudguard.repository;

import com.fraudguard.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for immutable, compliance-auditable activity logs.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Retrieves all audit log events paginated and ordered by newest first.
     *
     * @param pageable pagination parameters
     * @return Page of audit logs
     */
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Searches audit logs by actor email with case-insensitive partial matching.
     *
     * @param email actor email fragment
     * @param pageable pagination parameters
     * @return Page of matching audit logs
     */
    Page<AuditLog> findByActorEmailContainingIgnoreCase(String email, Pageable pageable);

    /**
     * Filters audit trail by specific administrative or operational action.
     *
     * @param action classification of action taken
     * @param pageable pagination parameters
     * @return Page of matching audit logs
     */
    Page<AuditLog> findByAction(String action, Pageable pageable);

    /**
     * Retrieves historical audit modifications for a specific domain entity.
     *
     * @param entityType domain entity type (e.g. FRAUD_RULE, BLACKLIST, TRANSACTION)
     * @param entityId target entity identifier
     * @param pageable pagination parameters
     * @return Page of entity audit history
     */
    Page<AuditLog> findByEntityTypeAndEntityId(String entityType, String entityId, Pageable pageable);

    /**
     * Searches audit logs filtering optionally by action and actor email.
     *
     * @param action optional action classification
     * @param actorEmail optional actor email substring
     * @param pageable pagination parameters
     * @return Page of matching audit logs
     */
    @org.springframework.data.jpa.repository.Query("SELECT a FROM AuditLog a WHERE " +
           "(:action IS NULL OR :action = '' OR a.action = :action) AND " +
           "(:actorEmail IS NULL OR :actorEmail = '' OR LOWER(a.actorEmail) LIKE LOWER(CONCAT('%', :actorEmail, '%'))) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLog> findByActionAndActorEmail(
            @org.springframework.data.repository.query.Param("action") String action,
            @org.springframework.data.repository.query.Param("actorEmail") String actorEmail,
            Pageable pageable
    );
}

