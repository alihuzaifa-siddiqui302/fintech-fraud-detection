// com.fraudguard.service.AnalystService
package com.fraudguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.cache.BlacklistCacheService;
import com.fraudguard.cache.RuleCacheService;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.dto.request.AddBlacklistRequest;
import com.fraudguard.dto.request.AdjudicateRequest;
import com.fraudguard.dto.request.UpdateRuleRequest;
import com.fraudguard.dto.response.AnalystTransactionDto;
import com.fraudguard.dto.response.AuditLogDto;
import com.fraudguard.dto.response.BlacklistDto;
import com.fraudguard.dto.response.FraudRuleDto;
import com.fraudguard.dto.response.MetricsDto;
import com.fraudguard.dto.response.PagedResponse;
import com.fraudguard.entity.AuditLog;
import com.fraudguard.entity.Blacklist;
import com.fraudguard.entity.FraudRule;
import com.fraudguard.entity.SessionSignal;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.TransactionRuleHit;
import com.fraudguard.entity.User;
import com.fraudguard.event.TransactionKafkaEvent;
import com.fraudguard.repository.AuditLogRepository;
import com.fraudguard.repository.BlacklistRepository;
import com.fraudguard.repository.FraudRuleRepository;
import com.fraudguard.repository.SessionSignalRepository;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.TransactionRuleHitRepository;
import com.fraudguard.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Service orchestrating compliance analyst operations, queue investigations, rule recalibration, and live metric aggregation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalystService {

    private final TransactionRepository transactionRepository;
    private final TransactionRuleHitRepository transactionRuleHitRepository;
    private final SessionSignalRepository sessionSignalRepository;
    private final BlacklistRepository blacklistRepository;
    private final FraudRuleRepository fraudRuleRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final RuleCacheService ruleCacheService;
    private final BlacklistCacheService blacklistCacheService;
    private final DashboardStreamService dashboardStreamService;
    private final MapperService mapperService;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;

    private final Map<String, User> userCache = new ConcurrentHashMap<>();

    /**
     * Aggregates key system fraud metrics and operational KPIs for the trailing 24-hour window.
     *
     * @return MetricsDto snapshot
     */
    @Transactional(readOnly = true)
    public MetricsDto getMetrics() {
        OffsetDateTime since = OffsetDateTime.now().minusHours(24);

        BigDecimal totalVolume = transactionRepository.sumAmountAfter(since);
        if (totalVolume == null) {
            totalVolume = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        long totalCount = transactionRepository.countByCreatedAtAfter(since);
        long blockedCount = transactionRepository.countByStatusAndCreatedAtAfter(AppConstants.TransactionStatus.BLOCKED, since);
        long pendingCount = transactionRepository.countByStatusAndCreatedAtAfter(AppConstants.TransactionStatus.PENDING_REVIEW, since);
        long approvedCount = transactionRepository.countByStatusAndCreatedAtAfter(AppConstants.TransactionStatus.APPROVED, since);

        String autoBlockRate = (totalCount == 0)
                ? "0.0%"
                : String.format(Locale.US, "%.1f%%", ((double) blockedCount / totalCount) * 100.0);

        double avgRiskScore = transactionRepository.averageRiskScoreAfter(since);
        double roundedAvgScore = BigDecimal.valueOf(avgRiskScore)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        return new MetricsDto(
                totalVolume,
                totalCount,
                blockedCount,
                pendingCount,
                approvedCount,
                autoBlockRate,
                roundedAvgScore
        );
    }

    /**
     * Searches and paginates transaction audit queues filtered optionally by status, IP, or ID prefix.
     *
     * @param status transaction adjudication status (e.g. ALL, PENDING_REVIEW, BLOCKED, APPROVED)
     * @param page zero-based page index
     * @param size page size
     * @param search optional keyword for IP address or transaction ID prefix
     * @return PagedResponse of AnalystTransactionDto
     */
    @Transactional(readOnly = true)
    public PagedResponse<AnalystTransactionDto> getTransactions(String status, int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Transaction> txnPage = transactionRepository.findByStatusAndSearch(status, search, pageable);

        Page<AnalystTransactionDto> dtoPage = txnPage.map(txn -> {
            List<TransactionRuleHit> ruleHits = transactionRuleHitRepository.findByTransactionId(txn.getId());
            User reviewer = resolveReviewer(txn.getReviewedBy());
            return mapperService.toAnalystDto(txn, ruleHits, reviewer);
        });

        return PagedResponse.from(dtoPage);
    }

    /**
     * Retrieves comprehensive transaction details including telemetry, behavioral session signals, and triggered rules.
     *
     * @param id transaction UUID
     * @return full AnalystTransactionDto
     */
    @Transactional(readOnly = true)
    public AnalystTransactionDto getTransactionById(String id) {
        Transaction txn = transactionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found with ID: " + id));

        List<TransactionRuleHit> ruleHits = transactionRuleHitRepository.findByTransactionId(id);
        SessionSignal sessionSignal = sessionSignalRepository.findByTransactionId(id).orElse(null);
        User reviewer = resolveReviewer(txn.getReviewedBy());

        return mapperService.toAnalystDto(txn, ruleHits, reviewer, sessionSignal);
    }

    /**
     * Resolves and records an analyst adjudication decision for a flagged transaction awaiting review.
     *
     * @param transactionId transaction UUID
     * @param request adjudication action payload (APPROVE or BLOCK with justification)
     * @param analystEmail authenticated analyst email address
     * @param clientIp network IP of the reviewing analyst
     * @return updated AnalystTransactionDto
     */
    @Transactional
    public AnalystTransactionDto adjudicate(
            String transactionId,
            AdjudicateRequest request,
            String analystEmail,
            String clientIp
    ) {
        Transaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found with ID: " + transactionId));

        if (!AppConstants.TransactionStatus.PENDING_REVIEW.equalsIgnoreCase(txn.getStatus())) {
            throw new IllegalArgumentException(
                    "Transaction status must be PENDING_REVIEW to adjudicate. Current status: " + txn.getStatus()
            );
        }

        User analyst = userRepository.findByEmail(analystEmail)
                .orElseThrow(() -> new EntityNotFoundException("Analyst account not found: " + analystEmail));

        List<TransactionRuleHit> ruleHits = transactionRuleHitRepository.findByTransactionId(transactionId);
        AnalystTransactionDto beforeDto = mapperService.toAnalystDto(txn, ruleHits, null);

        String newStatus = (request.getAction() == AdjudicateRequest.AdjudicateAction.APPROVE)
                ? AppConstants.TransactionStatus.APPROVED
                : AppConstants.TransactionStatus.BLOCKED;

        txn.setStatus(newStatus);
        txn.setReviewedBy(analyst.getId());
        txn.setResolutionNotes(request.getNotes());

        Transaction updatedTxn = transactionRepository.save(txn);
        AnalystTransactionDto afterDto = mapperService.toAnalystDto(updatedTxn, ruleHits, analyst);

        // Record compliance audit log
        String auditAction = newStatus.equals(AppConstants.TransactionStatus.APPROVED)
                ? AppConstants.AuditAction.TXN_APPROVED
                : AppConstants.AuditAction.TXN_BLOCKED;

        auditService.log(
                analyst.getId(),
                analyst.getEmail(),
                auditAction,
                "TRANSACTION",
                transactionId,
                beforeDto,
                afterDto,
                clientIp,
                request.getNotes()
        );

        // Broadcast decision event to Kafka
        publishTxnDecidedEvent(updatedTxn, analyst);

        return afterDto;
    }

    /**
     * Lists all global blacklist entries, optionally filtered by target type.
     *
     * @param targetType optional target type filter (IP, DEVICE, EMAIL, FINGERPRINT)
     * @return List of BlacklistDto entries
     */
    @Transactional(readOnly = true)
    public List<BlacklistDto> getBlacklists(String targetType) {
        List<Blacklist> entries = (targetType != null && !targetType.isBlank())
                ? blacklistRepository.findByTargetTypeOrderByCreatedAtDesc(targetType.toUpperCase())
                : blacklistRepository.findAllByOrderByCreatedAtDesc();

        return entries.stream()
                .map(bl -> {
                    User user = resolveReviewer(bl.getAddedBy());
                    return mapperService.toBlacklistDto(bl, user);
                })
                .toList();
    }

    /**
     * Registers a new entity onto the global negative-match blacklist.
     *
     * @param request validated blacklist entry request
     * @param analystEmail authenticated analyst email
     * @param clientIp analyst network IP address
     * @return created BlacklistDto
     */
    @Transactional
    public BlacklistDto addBlacklist(AddBlacklistRequest request, String analystEmail, String clientIp) {
        String targetType = request.getTargetType().trim().toUpperCase();
        String targetValue = request.getTargetValue().trim();

        if (blacklistRepository.existsByTargetTypeAndTargetValue(targetType, targetValue)) {
            throw new DataIntegrityViolationException(
                    "Blacklist entry already exists for " + targetType + ": " + targetValue
            );
        }

        User analyst = userRepository.findByEmail(analystEmail)
                .orElseThrow(() -> new EntityNotFoundException("Analyst account not found: " + analystEmail));

        Blacklist blacklist = Blacklist.builder()
                .targetType(targetType)
                .targetValue(targetValue)
                .reason(request.getReason())
                .addedBy(analyst.getId())
                .build();

        Blacklist saved = blacklistRepository.save(blacklist);

        // Update Redis hot cache
        blacklistCacheService.addToCache(targetType, targetValue);

        // Audit log
        auditService.log(
                analyst.getId(),
                analyst.getEmail(),
                AppConstants.AuditAction.BLACKLIST_ADDED,
                "BLACKLIST",
                saved.getId().toString(),
                null,
                saved,
                clientIp,
                request.getReason()
        );

        return mapperService.toBlacklistDto(saved, analyst);
    }

    /**
     * Removes an entry from the global blacklist.
     *
     * @param id blacklist database primary key
     * @param analystEmail authenticated analyst email
     * @param clientIp analyst network IP address
     */
    @Transactional
    public void deleteBlacklist(Long id, String analystEmail, String clientIp) {
        Blacklist entry = blacklistRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Blacklist record not found with ID: " + id));

        User analyst = userRepository.findByEmail(analystEmail)
                .orElseThrow(() -> new EntityNotFoundException("Analyst account not found: " + analystEmail));

        BlacklistDto beforeDto = mapperService.toBlacklistDto(entry, analyst);

        blacklistRepository.delete(entry);

        // Invalidate in Redis
        blacklistCacheService.removeFromCache(entry.getTargetType(), entry.getTargetValue());

        // Audit log
        auditService.log(
                analyst.getId(),
                analyst.getEmail(),
                AppConstants.AuditAction.BLACKLIST_REMOVED,
                "BLACKLIST",
                id.toString(),
                beforeDto,
                null,
                clientIp,
                "Blacklist record removed by analyst"
        );
    }

    /**
     * Retrieves all fraud detection rules ordered by risk weight descending.
     *
     * @return List of FraudRuleDto definitions
     */
    @Transactional(readOnly = true)
    public List<FraudRuleDto> getRules() {
        return fraudRuleRepository.findAllByOrderByRiskWeightDesc().stream()
                .map(mapperService::toFraudRuleDto)
                .toList();
    }

    /**
     * Recalibrates a fraud detection rule threshold, risk weight, or enabled state.
     *
     * @param id rule database primary key
     * @param request update payload
     * @param analystEmail authenticated analyst email
     * @param clientIp analyst network IP address
     * @return updated FraudRuleDto
     */
    @Transactional
    public FraudRuleDto updateRule(Long id, UpdateRuleRequest request, String analystEmail, String clientIp) {
        FraudRule rule = fraudRuleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Fraud rule not found with ID: " + id));

        User analyst = userRepository.findByEmail(analystEmail)
                .orElseThrow(() -> new EntityNotFoundException("Analyst account not found: " + analystEmail));

        FraudRuleDto beforeDto = mapperService.toFraudRuleDto(rule);

        rule.setThresholdValue(request.getThresholdValue());
        rule.setRiskWeight(request.getRiskWeight());
        rule.setIsEnabled(request.getIsEnabled());

        FraudRule saved = fraudRuleRepository.save(rule);
        FraudRuleDto afterDto = mapperService.toFraudRuleDto(saved);

        // Invalidate active rule Redis cache
        ruleCacheService.invalidateCache();

        // Audit log
        auditService.log(
                analyst.getId(),
                analyst.getEmail(),
                AppConstants.AuditAction.RULE_UPDATED,
                "FRAUD_RULE",
                id.toString(),
                beforeDto,
                afterDto,
                clientIp,
                "Recalibrated rule threshold: " + request.getThresholdValue() + ", weight: " + request.getRiskWeight()
        );

        return afterDto;
    }

    /**
     * Queries immutable audit trail records with optional action and actor email filtering.
     *
     * @param page zero-based page index
     * @param size page size
     * @param action optional action classification filter
     * @param actorEmail optional actor email substring filter
     * @return PagedResponse of AuditLogDto
     */
    @Transactional(readOnly = true)
    public PagedResponse<AuditLogDto> getAuditLogs(int page, int size, String action, String actorEmail) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AuditLog> logPage = auditLogRepository.findByActionAndActorEmail(action, actorEmail, pageable);
        Page<AuditLogDto> dtoPage = logPage.map(mapperService::toAuditLogDto);
        return PagedResponse.from(dtoPage);
    }

    /**
     * Subscribes a compliance client to live Server-Sent Events (SSE) transaction review streams.
     *
     * @return SseEmitter instance
     */
    public SseEmitter subscribeDashboardStream() {
        return dashboardStreamService.registerEmitter();
    }

    private User resolveReviewer(String reviewerId) {
        if (reviewerId == null) {
            return null;
        }
        return userCache.computeIfAbsent(reviewerId, id ->
                userRepository.findById(id).orElse(null)
        );
    }

    private void publishTxnDecidedEvent(Transaction txn, User analyst) {
        try {
            TransactionKafkaEvent event = TransactionKafkaEvent.builder()
                    .eventType("TXN_DECIDED")
                    .transactionId(txn.getId())
                    .userId(txn.getUserId())
                    .amount(txn.getAmount())
                    .currency(txn.getCurrency())
                    .ipAddress(txn.getIpAddress())
                    .ipCountry(txn.getIpCountry())
                    .riskScore(txn.getRiskScore())
                    .status(txn.getStatus())
                    .reviewedBy(analyst.getEmail())
                    .resolutionNotes(txn.getResolutionNotes())
                    .timestamp(OffsetDateTime.now())
                    .build();

            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(AppConstants.KafkaTopics.TXN_DECIDED, txn.getId(), payload)
                    .whenComplete((res, ex) -> {
                        if (ex != null) {
                            log.warn("Kafka publication failed for decided transaction [{}]: {}",
                                    txn.getId(), ex.getMessage());
                        } else {
                            log.debug("Successfully published decided transaction [{}] to Kafka", txn.getId());
                        }
                    });
        } catch (Exception ex) {
            log.warn("Failed to serialize or dispatch txn.decided event to Kafka: {}", ex.getMessage());
        }
    }
}
