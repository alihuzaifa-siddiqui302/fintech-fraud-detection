// com.fraudguard.repository.SarReportRepository
package com.fraudguard.repository;

import com.fraudguard.entity.SarReport;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for AI-generated Suspicious Activity Reports.
 */
@Repository
public interface SarReportRepository extends JpaRepository<SarReport, String> {

    /** Fetch all SAR reports for forensic drawer display */
    List<SarReport> findByTransactionIdOrderByCreatedAtDesc(String transactionId);

    /** Most recent SAR for quick status check */
    Optional<SarReport> findTopByTransactionIdOrderByCreatedAtDesc(String transactionId);

    /** Analyst's own generated reports */
    Page<SarReport> findByGeneratedByOrderByCreatedAtDesc(String generatedBy, Pageable pageable);

    /** Filter by filing status for compliance workflow */
    Page<SarReport> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    /** Count total SARs generated — for metrics */
    long countByStatus(String status);
}
