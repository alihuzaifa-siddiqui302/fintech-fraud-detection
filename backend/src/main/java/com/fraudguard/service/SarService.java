// com.fraudguard.service.SarService
package com.fraudguard.service;

import com.fraudguard.client.GeminiApiClient;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.dto.response.SarReportDto;
import com.fraudguard.entity.SarReport;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.TransactionRuleHit;
import com.fraudguard.entity.User;
import com.fraudguard.exception.ApiException;
import com.fraudguard.exception.ResourceNotFoundException;
import com.fraudguard.repository.SarReportRepository;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.TransactionRuleHitRepository;
import com.fraudguard.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Compliance service for generating and managing AI Suspicious Activity Reports (SAR).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class SarService {

    private final SarReportRepository sarReportRepository;
    private final GeminiApiClient geminiApiClient;
    private final SarPromptBuilder sarPromptBuilder;
    private final TransactionRepository transactionRepository;
    private final TransactionRuleHitRepository transactionRuleHitRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    /**
     * Generates a regulatory-standard FinCEN SAR narrative via Google Gemini 2.0 Flash.
     *
     * @param transactionId target transaction UUID
     * @param analystEmail requesting analyst email
     * @param analystIp requesting analyst IP address
     * @return generated SarReportDto in DRAFT status
     */
    public SarReportDto generateSar(String transactionId, String analystEmail, String analystIp) {
        Transaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));

        if (!"BLOCKED".equalsIgnoreCase(txn.getStatus()) && txn.getReviewedBy() == null) {
            throw new ApiException(400, "SAR can only be generated for BLOCKED or adjudicated transactions");
        }

        User customer = userRepository.findById(txn.getUserId()).orElse(null);
        User analyst = userRepository.findByEmail(analystEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Analyst user not found: " + analystEmail));

        List<TransactionRuleHit> ruleHits = transactionRuleHitRepository.findByTransactionId(transactionId);
        String prompt = sarPromptBuilder.buildPrompt(txn, ruleHits, customer, analyst);

        log.info("Dispatching SAR generation request to Gemini 2.0 Flash for txn [{}]", transactionId);
        GeminiApiClient.GeminiGenerationResult result = geminiApiClient.generate(prompt);

        SarReport sarReport = SarReport.builder()
                .transactionId(transactionId)
                .generatedBy(analyst.getId())
                .reportText(result.text())
                .modelUsed("gemini-2.0-flash")
                .promptTokenCount(result.promptTokens())
                .outputTokenCount(result.outputTokens())
                .generationMs(result.generationMs())
                .status("DRAFT")
                .build();

        SarReport saved = sarReportRepository.save(sarReport);

        Map<String, Object> afterMeta = Map.of(
                "model", "gemini-2.0-flash",
                "tokens", result.outputTokens(),
                "generationMs", result.generationMs()
        );

        auditService.log(
                analyst.getId(),
                analystEmail,
                AppConstants.AuditAction.SAR_GENERATED,
                "sar_reports",
                saved.getId(),
                null,
                afterMeta,
                analystIp,
                "Generated AI SAR narrative for transaction " + transactionId
        );

        log.info("SAR generated txn={} analyst={} outputTokens={} ms={}",
                transactionId, analystEmail, result.outputTokens(), result.generationMs());

        return toDto(saved, analyst.getEmail(), null);
    }

    /**
     * Transitions SAR report through filing lifecycle (DRAFT -> FINAL -> FILED).
     *
     * @param sarId target SAR report UUID
     * @param newStatus requested status
     * @param notes optional compliance notes
     * @param analystEmail actioning analyst email
     * @param analystIp actioning analyst IP address
     * @return updated SarReportDto
     */
    public SarReportDto updateSarStatus(String sarId, String newStatus, String notes, String analystEmail, String analystIp) {
        SarReport sarReport = sarReportRepository.findById(sarId)
                .orElseThrow(() -> new ResourceNotFoundException("SAR Report not found: " + sarId));

        String currentStatus = sarReport.getStatus();
        String requestedStatus = newStatus != null ? newStatus.toUpperCase().trim() : "";

        boolean isValidTransition = ("DRAFT".equals(currentStatus) && "FINAL".equals(requestedStatus))
                || ("FINAL".equals(currentStatus) && "FILED".equals(requestedStatus));

        if (!isValidTransition) {
            throw new ApiException(400, String.format("Invalid status transition: %s → %s", currentStatus, requestedStatus));
        }

        User analyst = userRepository.findByEmail(analystEmail).orElse(null);
        String analystId = analyst != null ? analyst.getId() : null;

        if ("FILED".equals(requestedStatus)) {
            sarReport.setFiledAt(OffsetDateTime.now());
            sarReport.setFiledBy(analystId);
        }

        if (notes != null && !notes.isBlank()) {
            sarReport.setNotes(notes.trim());
        }

        sarReport.setStatus(requestedStatus);
        SarReport saved = sarReportRepository.save(sarReport);

        auditService.log(
                analystId,
                analystEmail,
                AppConstants.AuditAction.SAR_STATUS_UPDATED,
                "sar_reports",
                sarId,
                Map.of("status", currentStatus),
                Map.of("status", requestedStatus),
                analystIp,
                notes != null ? notes : ("SAR status updated to " + requestedStatus)
        );

        String generatedByEmail = resolveUserEmail(saved.getGeneratedBy());
        String filedByEmail = resolveUserEmail(saved.getFiledBy());

        return toDto(saved, generatedByEmail, filedByEmail);
    }

    /**
     * Retrieves all SAR drafts and filings recorded for a transaction.
     *
     * @param transactionId transaction UUID
     * @return list of SarReportDto ordered by creation timestamp descending
     */
    @Transactional(readOnly = true)
    public List<SarReportDto> getReportsForTransaction(String transactionId) {
        List<SarReport> reports = sarReportRepository.findByTransactionIdOrderByCreatedAtDesc(transactionId);
        Map<String, String> userEmailCache = new HashMap<>();

        return reports.stream().map(r -> {
            String genEmail = userEmailCache.computeIfAbsent(r.getGeneratedBy(), this::resolveUserEmail);
            String filedEmail = r.getFiledBy() != null
                    ? userEmailCache.computeIfAbsent(r.getFiledBy(), this::resolveUserEmail)
                    : null;
            return toDto(r, genEmail, filedEmail);
        }).toList();
    }

    private String resolveUserEmail(String userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(User::getEmail).orElse(userId);
    }

    private SarReportDto toDto(SarReport report, String generatedByEmail, String filedByEmail) {
        return new SarReportDto(
                report.getId(),
                report.getTransactionId(),
                report.getReportText(),
                report.getModelUsed(),
                report.getPromptTokenCount(),
                report.getOutputTokenCount(),
                report.getGenerationMs(),
                report.getStatus(),
                generatedByEmail,
                filedByEmail,
                report.getFiledAt(),
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }
}
