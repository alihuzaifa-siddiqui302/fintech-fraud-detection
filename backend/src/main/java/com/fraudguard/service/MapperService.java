// com.fraudguard.service.MapperService
package com.fraudguard.service;

import com.fraudguard.dto.response.AnalystTransactionDto;
import com.fraudguard.dto.response.AuditLogDto;
import com.fraudguard.dto.response.BlacklistDto;
import com.fraudguard.dto.response.FraudRuleDto;
import com.fraudguard.dto.response.RuleHitDto;
import com.fraudguard.dto.response.TransactionSummaryDto;
import com.fraudguard.entity.AuditLog;
import com.fraudguard.entity.Blacklist;
import com.fraudguard.entity.FraudRule;
import com.fraudguard.entity.SessionSignal;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.TransactionRuleHit;
import com.fraudguard.entity.User;
import com.fraudguard.repository.FraudRuleRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Centralized mapping service translating domain entities into presentation and API DTO contracts.
 */
@Service
@RequiredArgsConstructor
public class MapperService {

    private final FraudRuleRepository fraudRuleRepository;
    private final Map<Long, FraudRule> ruleIdCache = new ConcurrentHashMap<>();

    /**
     * Converts a Transaction entity, its associated rule hits, and optional reviewer into an AnalystTransactionDto.
     *
     * @param txn transaction entity
     * @param ruleHits list of rule hits for this transaction
     * @param reviewer analyst user who reviewed the transaction, or null
     * @return populated AnalystTransactionDto
     */
    public AnalystTransactionDto toAnalystDto(Transaction txn, List<TransactionRuleHit> ruleHits, User reviewer) {
        return toAnalystDto(txn, ruleHits, reviewer, null);
    }

    /**
     * Converts a Transaction entity, associated rule hits, reviewer, and optional SessionSignal into an AnalystTransactionDto.
     *
     * @param txn transaction entity
     * @param ruleHits list of rule hits for this transaction
     * @param reviewer analyst user who reviewed the transaction, or null
     * @param sessionSignal optional behavioral session signal
     * @return populated AnalystTransactionDto
     */
    public AnalystTransactionDto toAnalystDto(
            Transaction txn,
            List<TransactionRuleHit> ruleHits,
            User reviewer,
            SessionSignal sessionSignal
    ) {
        List<RuleHitDto> ruleHitDtos = (ruleHits == null) ? Collections.emptyList() : ruleHits.stream()
                .map(this::toRuleHitDto)
                .toList();

        Long timeOnPage = (sessionSignal != null && sessionSignal.getTimeOnPageMs() != null)
                ? sessionSignal.getTimeOnPageMs()
                : txn.getTimeOnPageMs();

        Boolean paste = (sessionSignal != null && sessionSignal.getPasteDetected() != null)
                ? sessionSignal.getPasteDetected()
                : txn.getPasteDetected();

        Boolean headless = (sessionSignal != null && sessionSignal.getIsHeadlessBrowser() != null)
                ? sessionSignal.getIsHeadlessBrowser()
                : txn.getIsHeadless();

        String reviewerName = (reviewer != null) ? reviewer.getName() : null;

        return new AnalystTransactionDto(
                txn.getId(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getIpAddress(),
                txn.getIpCountry(),
                txn.getIpCity(),
                txn.getDeviceFingerprint(),
                txn.getDeviceType(),
                txn.getBrowser(),
                txn.getOs(),
                txn.getIsVpn(),
                txn.getIsTor(),
                txn.getIsProxy(),
                txn.getIsHostingIp(),
                txn.getIpqsFraudScore(),
                txn.getRiskScore(),
                txn.getStatus(),
                resolveStatusColor(txn.getStatus()),
                timeOnPage,
                paste,
                txn.getTimezoneMismatch(),
                headless,
                ruleHitDtos,
                reviewerName,
                txn.getResolutionNotes(),
                txn.getCreatedAt()
        );
    }

    /**
     * Converts an individual TransactionRuleHit audit record into a RuleHitDto.
     *
     * @param hit transaction rule hit entity
     * @return RuleHitDto with resolved rule code and human-readable name
     */
    public RuleHitDto toRuleHitDto(TransactionRuleHit hit) {
        FraudRule rule = ruleIdCache.computeIfAbsent(hit.getRuleId(), id ->
                fraudRuleRepository.findById(id).orElse(null)
        );

        String ruleCode = (rule != null) ? rule.getRuleCode() : "RULE_" + hit.getRuleId();
        String ruleName = (rule != null) ? rule.getName() : "Rule #" + hit.getRuleId();

        return new RuleHitDto(
                ruleCode,
                ruleName,
                hit.getWeightApplied(),
                hit.getTriggerReason(),
                hit.getObservedValue()
        );
    }

    /**
     * Converts a Transaction entity into a compact customer portfolio summary DTO.
     *
     * @param txn transaction entity
     * @return TransactionSummaryDto
     */
    public TransactionSummaryDto toSummaryDto(Transaction txn) {
        return new TransactionSummaryDto(
                txn.getId(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getStatus(),
                resolveStatusColor(txn.getStatus()),
                txn.getRiskScore(),
                txn.getCreatedAt()
        );
    }

    /**
     * Converts a FraudRule entity into an administrative configuration DTO.
     *
     * @param rule fraud rule entity
     * @return FraudRuleDto
     */
    public FraudRuleDto toFraudRuleDto(FraudRule rule) {
        return new FraudRuleDto(
                rule.getId(),
                rule.getRuleCode(),
                rule.getName(),
                rule.getDescription(),
                rule.getThresholdValue(),
                rule.getRiskWeight(),
                rule.getIsEnabled(),
                rule.getUpdatedAt()
        );
    }

    /**
     * Converts a Blacklist entity into an analyst management DTO.
     *
     * @param bl blacklist entity
     * @param addedBy user entity who registered the blacklist entry
     * @return BlacklistDto
     */
    public BlacklistDto toBlacklistDto(Blacklist bl, User addedBy) {
        String addedByEmail = (addedBy != null) ? addedBy.getEmail() : bl.getAddedBy();
        return new BlacklistDto(
                bl.getId(),
                bl.getTargetType(),
                bl.getTargetValue(),
                bl.getReason(),
                addedByEmail,
                bl.getCreatedAt()
        );
    }

    /**
     * Converts an immutable AuditLog entity into an auditable DTO.
     *
     * @param log audit log entity
     * @return AuditLogDto
     */
    public AuditLogDto toAuditLogDto(AuditLog log) {
        return new AuditLogDto(
                log.getId(),
                log.getActorEmail(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getBeforeValue(),
                log.getAfterValue(),
                log.getIpAddress(),
                log.getNotes(),
                log.getCreatedAt()
        );
    }

    /**
     * Determines UI status badge color based on transaction adjudication state.
     *
     * @param status transaction status string
     * @return color code string ("green", "amber", "red", or "grey")
     */
    public String resolveStatusColor(String status) {
        if (status == null) {
            return "grey";
        }
        return switch (status.toUpperCase()) {
            case "APPROVED" -> "green";
            case "PENDING_REVIEW" -> "amber";
            case "BLOCKED" -> "red";
            default -> "grey";
        };
    }
}
