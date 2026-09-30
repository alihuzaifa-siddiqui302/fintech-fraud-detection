// com.fraudguard.service.CheckoutService
package com.fraudguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.dto.request.CheckoutRequest;
import com.fraudguard.dto.response.AnalystTransactionDto;
import com.fraudguard.dto.response.CheckoutResponse;
import com.fraudguard.dto.response.OtpChallengeDto;
import com.fraudguard.dto.response.RuleHitDto;
import com.fraudguard.engine.FraudRiskEngine;
import com.fraudguard.engine.model.EnrichedTransactionContext;
import com.fraudguard.engine.model.RiskEvaluationResult;
import com.fraudguard.engine.model.RuleResult;
import com.fraudguard.entity.Blacklist;
import com.fraudguard.entity.FraudRule;
import com.fraudguard.entity.SessionSignal;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.TransactionBlacklistHit;
import com.fraudguard.entity.TransactionRuleHit;
import com.fraudguard.entity.User;
import com.fraudguard.messaging.FraudGuardEventProducer;
import com.fraudguard.messaging.event.TransactionKafkaEvent;
import com.fraudguard.repository.BlacklistRepository;
import com.fraudguard.repository.FraudRuleRepository;
import com.fraudguard.repository.SessionSignalRepository;
import com.fraudguard.repository.TransactionBlacklistHitRepository;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.TransactionRuleHitRepository;
import com.fraudguard.repository.UserRepository;
import com.fraudguard.util.IpExtractor;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core transactional checkout orchestrator executing enrichment, risk scoring, atomic persistence, and async streaming.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final UserRepository userRepository;
    private final IpExtractor ipExtractor;
    private final EnrichmentService enrichmentService;
    private final FraudRiskEngine fraudRiskEngine;
    private final TransactionRepository transactionRepository;
    private final TransactionRuleHitRepository transactionRuleHitRepository;
    private final TransactionBlacklistHitRepository transactionBlacklistHitRepository;
    private final SessionSignalRepository sessionSignalRepository;
    private final BlacklistRepository blacklistRepository;
    private final FraudRuleRepository fraudRuleRepository;
    private final DashboardStreamService dashboardStreamService;
    private final MapperService mapperService;
    private final ObjectMapper objectMapper;
    private final FraudGuardEventProducer eventProducer;
    private final OtpService otpService;

    @org.springframework.beans.factory.annotation.Value("${fraudguard.otp.enabled:true}")
    private boolean otpEnabled;

    /**
     * Evaluates and records a financial checkout transaction end-to-end.
     *
     * @param request client checkout payload
     * @param authenticatedEmail authenticated user email from JWT
     * @param httpRequest HTTP servlet request for network IP extraction
     * @return synchronous CheckoutResponse with adjudication status and risk breakdown
     */
    @Transactional
    public CheckoutResponse processCheckout(
            CheckoutRequest request,
            String authenticatedEmail,
            HttpServletRequest httpRequest
    ) {
        log.info("Initiating checkout processing for user: {}, amount: {} {}",
                authenticatedEmail, request.getAmount(), request.getCurrency());

        // 1. Load authenticated user identity
        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() -> new EntityNotFoundException("Customer account not found: " + authenticatedEmail));

        // 2. Extract network IP address
        String clientIp = ipExtractor.extractClientIp(httpRequest);

        // 3. Asynchronously enrich transaction context with geo, IPQS, velocity, and device signals
        EnrichedTransactionContext enrichedCtx = enrichmentService.enrich(request, user, clientIp);

        // 4. Adjudicate transaction against the 20-rule Fraud Risk Engine
        RiskEvaluationResult evalResult = fraudRiskEngine.evaluate(enrichedCtx);

        // 5. Serialize triggered rules to JSONB format
        String triggeredRulesJson = null;
        try {
            triggeredRulesJson = objectMapper.writeValueAsString(evalResult.getTriggeredRules());
        } catch (Exception ex) {
            log.warn("Failed serializing triggered rules to JSON: {}", ex.getMessage());
        }

        // 6. Build and persist Transaction record atomically
        Transaction txn = Transaction.builder()
                .userId(user.getId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .ipAddress(enrichedCtx.getResolvedIpAddress())
                .ipCountry(enrichedCtx.getIpCountry())
                .ipCity(enrichedCtx.getIpCity())
                .ipIsp(enrichedCtx.getIpIsp())
                .deviceFingerprint(enrichedCtx.getDeviceFingerprint())
                .deviceType(request.getDeviceType())
                .browser(request.getBrowser())
                .os(request.getOs())
                .screenResolution(request.getScreenResolution())
                .timeOnPageMs(request.getTimeOnPageMs())
                .pasteDetected(enrichedCtx.getPasteDetected())
                .timezoneMismatch(enrichedCtx.getTimezoneMismatch())
                .isHeadless(enrichedCtx.getIsHeadless())
                .isVpn(enrichedCtx.isVpn())
                .isTor(enrichedCtx.isTor())
                .isProxy(enrichedCtx.isProxy())
                .isHostingIp(enrichedCtx.isHostingIp())
                .ipqsFraudScore(enrichedCtx.getIpqsFraudScore())
                .riskScore(evalResult.getTotalScore())
                .status(evalResult.getStatus())
                .triggeredRules(triggeredRulesJson)
                .build();

        Transaction savedTxn = transactionRepository.save(txn);

        // 7. Persist individual TransactionRuleHit audit records
        List<TransactionRuleHit> savedHits = new ArrayList<>();
        for (RuleResult hit : evalResult.getTriggeredRules()) {
            Optional<FraudRule> ruleOpt = fraudRuleRepository.findByRuleCode(hit.ruleCode());
            if (ruleOpt.isPresent()) {
                FraudRule rule = ruleOpt.get();
                TransactionRuleHit ruleHit = TransactionRuleHit.builder()
                        .transactionId(savedTxn.getId())
                        .ruleId(rule.getId())
                        .weightApplied(hit.pointsApplied())
                        .observedValue(hit.observedValue())
                        .triggerReason(hit.reason())
                        .build();
                savedHits.add(transactionRuleHitRepository.save(ruleHit));
            }
        }

        // 8. Persist client session behavioral telemetry signals
        SessionSignal sessionSignal = SessionSignal.builder()
                .transactionId(savedTxn.getId())
                .timeOnPageMs(request.getTimeOnPageMs())
                .mouseMovementCount(request.getMouseMovementCount())
                .keystrokeVariance(request.getKeystrokeVariance() != null
                        ? BigDecimal.valueOf(request.getKeystrokeVariance()) : null)
                .pasteDetected(enrichedCtx.getPasteDetected())
                .isHeadlessBrowser(enrichedCtx.getIsHeadless())
                .browserTimezone(request.getBrowserTimezone())
                .ipTimezone(enrichedCtx.getIpTimezone())
                .screenResolution(request.getScreenResolution())
                .build();
        sessionSignalRepository.save(sessionSignal);

        // 9. Link blacklist match records if instant block or blacklist rule fired
        if (evalResult.isInstantBlock()) {
            linkBlacklistMatch(savedTxn.getId(), "IP", enrichedCtx.getResolvedIpAddress());
            linkBlacklistMatch(savedTxn.getId(), "FINGERPRINT", enrichedCtx.getDeviceFingerprint());
            linkBlacklistMatch(savedTxn.getId(), "EMAIL", enrichedCtx.getUserEmail());
            linkBlacklistMatch(savedTxn.getId(), "DEVICE", enrichedCtx.getDeviceFingerprint());
        }

        // 10. Asynchronously publish transaction evaluation event to Kafka
        publishKafkaEvent(savedTxn, evalResult);

        // 11. Risk-band split for PENDING_REVIEW:
        //   Score 30–50 → OTP step-up only (customer self-serves; no analyst involvement)
        //   Score 51–69 → OTP step-up AND analyst queue (high-risk; human oversight required)
        final int score = evalResult.getTotalScore();
        final boolean isPending = AppConstants.TransactionStatus.PENDING_REVIEW.equalsIgnoreCase(savedTxn.getStatus());
        final boolean isHighRiskPending = isPending && score > AppConstants.DecisionThreshold.OTP_ONLY_MAX;

        if (isHighRiskPending) {
            // Score 51-69: broadcast to analyst queue for human oversight
            log.info("Transaction [{}] score={} — HIGH-RISK PENDING (>{}). Notifying analyst queue.",
                    savedTxn.getId(), score, AppConstants.DecisionThreshold.OTP_ONLY_MAX);
            AnalystTransactionDto analystDto = mapperService.toAnalystDto(savedTxn, savedHits, null, sessionSignal);
            dashboardStreamService.broadcastPendingTransaction(analystDto);
        } else if (isPending) {
            // Score 30-50: OTP only — no analyst needed, customer self-serves
            log.info("Transaction [{}] score={} — LOW-RISK PENDING (≤{}). OTP step-up only, skipping analyst queue.",
                    savedTxn.getId(), score, AppConstants.DecisionThreshold.OTP_ONLY_MAX);
        }

        // 12. Resolve visual status color and message
        String statusColor = switch (evalResult.getStatus()) {
            case AppConstants.TransactionStatus.APPROVED -> "green";
            case AppConstants.TransactionStatus.PENDING_REVIEW -> "amber";
            case AppConstants.TransactionStatus.BLOCKED -> "red";
            default -> "grey";
        };

        String statusMessage = switch (evalResult.getStatus()) {
            case AppConstants.TransactionStatus.APPROVED -> "Transaction approved.";
            case AppConstants.TransactionStatus.PENDING_REVIEW ->
                    "Transaction held for compliance review. Funds are temporarily on hold.";
            case AppConstants.TransactionStatus.BLOCKED ->
                    "Transaction declined. If you believe this is an error, contact support.";
            default -> "Transaction processed.";
        };

        List<RuleHitDto> ruleHitDtos = evalResult.getTriggeredRules().stream()
                .map(r -> new RuleHitDto(r.ruleCode(), r.ruleName(), r.pointsApplied(), r.reason(), r.observedValue()))
                .toList();

        OffsetDateTime timestamp = savedTxn.getCreatedAt() != null ? savedTxn.getCreatedAt() : OffsetDateTime.now();

        // 13. If PENDING_REVIEW and 3DS OTP step-up is enabled, trigger challenge (both bands)
        if (isPending && otpEnabled) {
            log.info("Transaction [{}] score={} — issuing 3DS OTP challenge (band: {}).",
                    savedTxn.getId(), score, score <= AppConstants.DecisionThreshold.OTP_ONLY_MAX ? "OTP_ONLY" : "OTP_AND_ANALYST");
            OtpChallengeDto otpChallenge = otpService.issueChallenge(savedTxn.getId(), user.getEmail());

            return new CheckoutResponse(
                    savedTxn.getId(),
                    "OTP_REQUIRED",
                    score,
                    "blue",
                    isHighRiskPending
                        ? "Verification required. Your transaction is also under review by our security team."
                        : "Verification required. We've sent a 6-digit code to your email.",
                    ruleHitDtos,
                    evalResult.getAllResults().size(),
                    timestamp,
                    savedTxn.getId(),
                    otpChallenge.demoOtp(),
                    otpChallenge.maskedEmail(),
                    otpChallenge.expiresAt()
            );
        }

        return new CheckoutResponse(
                savedTxn.getId(),
                savedTxn.getStatus(),
                evalResult.getTotalScore(),
                statusColor,
                statusMessage,
                ruleHitDtos,
                evalResult.getAllResults().size(),
                timestamp
        );
    }

    private void linkBlacklistMatch(String transactionId, String targetType, String targetValue) {
        if (targetValue == null || targetValue.isBlank()) {
            return;
        }
        blacklistRepository.findByTargetTypeAndTargetValue(targetType, targetValue)
                .ifPresent(bl -> {
                    TransactionBlacklistHit hit = TransactionBlacklistHit.builder()
                            .transactionId(transactionId)
                            .blacklistId(bl.getId())
                            .build();
                    transactionBlacklistHitRepository.save(hit);
                });
    }

    private void publishKafkaEvent(Transaction txn, RiskEvaluationResult evalResult) {
        List<String> triggeredCodes = evalResult.getTriggeredRules().stream()
                .map(RuleResult::ruleCode)
                .toList();

        TransactionKafkaEvent event = new TransactionKafkaEvent(
                txn.getId(),
                txn.getUserId(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getStatus(),
                txn.getRiskScore(),
                txn.getIpAddress(),
                txn.getIpCountry(),
                txn.getIsVpn() != null && txn.getIsVpn(),
                txn.getIsTor() != null && txn.getIsTor(),
                triggeredCodes,
                txn.getCreatedAt() != null ? txn.getCreatedAt() : OffsetDateTime.now(),
                "TXN_SUBMITTED"
        );

        eventProducer.publishTransaction(event);
    }
}
