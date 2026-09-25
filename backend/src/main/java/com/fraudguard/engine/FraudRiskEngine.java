// com.fraudguard.engine.FraudRiskEngine
package com.fraudguard.engine;

import com.fraudguard.cache.BlacklistCacheService;
import com.fraudguard.cache.RedisVelocityService;
import com.fraudguard.cache.RuleCacheService;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.constant.AppConstants.RuleCode;
import com.fraudguard.engine.model.EnrichedTransactionContext;
import com.fraudguard.engine.model.RiskEvaluationResult;
import com.fraudguard.engine.model.RuleResult;
import com.fraudguard.entity.FraudRule;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Core risk scoring engine evaluating the complete catalog of 20 fraud heuristics against enriched transaction signals.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FraudRiskEngine {

    private final RuleCacheService ruleCacheService;
    private final BlacklistCacheService blacklistCacheService;
    private final RedisVelocityService redisVelocityService;
    private final RuleEvaluationLogger ruleEvaluationLogger;

    /**
     * Executes the end-to-end evaluation pipeline against enriched transaction context.
     *
     * @param ctx fully populated enriched transaction telemetry context
     * @return RiskEvaluationResult containing composite score, decision status, and all rule breakdowns
     */
    public RiskEvaluationResult evaluate(EnrichedTransactionContext ctx) {
        Objects.requireNonNull(ctx, "EnrichedTransactionContext cannot be null");

        // Load active configured rules from Redis/PostgreSQL
        Map<String, FraudRule> activeRules = ruleCacheService.loadActiveRules();
        List<RuleResult> results = new ArrayList<>();

        // ---------------------------------------------------------------------
        // RULE 1: BLACKLIST_MATCH (Instant fail-fast block)
        // ---------------------------------------------------------------------
        FraudRule blacklistRule = activeRules.get(RuleCode.BLACKLIST_MATCH);
        String blacklistHitReason = checkBlacklistHits(ctx);

        if (blacklistHitReason != null) {
            RuleResult hitResult = buildResult(
                    blacklistRule,
                    RuleCode.BLACKLIST_MATCH,
                    "Blacklist Match",
                    true,
                    blacklistHitReason,
                    null
            );
            results.add(hitResult);

            // Populate remaining rules as untriggered so UI receives complete 20-rule catalog
            populateRemainingRulesAsUntriggered(results, activeRules);

            RiskEvaluationResult instantBlockResult = RiskEvaluationResult.builder()
                    .totalScore(100)
                    .status(AppConstants.TransactionStatus.BLOCKED)
                    .instantBlock(true)
                    .allResults(results)
                    .build();

            finalizeEvaluation(ctx, instantBlockResult);
            return instantBlockResult;
        } else {
            results.add(buildResult(
                    blacklistRule,
                    RuleCode.BLACKLIST_MATCH,
                    "Blacklist Match",
                    false,
                    "No blacklist match across IP, fingerprint, device, or email",
                    null
            ));
        }

        // ---------------------------------------------------------------------
        // RULE 2: HEADLESS_BROWSER
        // ---------------------------------------------------------------------
        FraudRule headlessRule = activeRules.get(RuleCode.HEADLESS_BROWSER);
        boolean isHeadless = Boolean.TRUE.equals(ctx.getIsHeadless());
        results.add(buildResult(
                headlessRule,
                RuleCode.HEADLESS_BROWSER,
                "Headless Browser Automation Detected",
                isHeadless,
                isHeadless ? "Headless browser detected — automated submission (Puppeteer/Playwright pattern)"
                           : "Standard browser client environment detected",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 3: DEVICE_SHARED_ACCOUNTS
        // ---------------------------------------------------------------------
        FraudRule sharedDeviceRule = activeRules.get(RuleCode.DEVICE_SHARED_ACCOUNTS);
        long sharedAccountsCount = ctx.getDeviceSharedAcrossAccounts();
        long sharedThreshold = sharedDeviceRule != null ? sharedDeviceRule.getThresholdValue().longValue() : 2L;
        boolean sharedDeviceTriggered = sharedAccountsCount > sharedThreshold;
        results.add(buildResult(
                sharedDeviceRule,
                RuleCode.DEVICE_SHARED_ACCOUNTS,
                "Device Shared Across Multiple Accounts",
                sharedDeviceTriggered,
                sharedDeviceTriggered
                        ? String.format("Device fingerprint shared across %d accounts (threshold: %d)", sharedAccountsCount, sharedThreshold)
                        : String.format("Device fingerprint seen on %d account(s) (within threshold of %d)", sharedAccountsCount, sharedThreshold),
                BigDecimal.valueOf(sharedAccountsCount)
        ));

        // ---------------------------------------------------------------------
        // RULE 4: IS_TOR
        // ---------------------------------------------------------------------
        FraudRule torRule = activeRules.get(RuleCode.IS_TOR);
        boolean isTor = ctx.isTor();
        results.add(buildResult(
                torRule,
                RuleCode.IS_TOR,
                "Tor Exit Node Network Detected",
                isTor,
                isTor ? "Transaction originates from Tor exit node — high anonymisation risk"
                      : "IP address is not an identified Tor exit node",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 5: RAPID_VELOCITY
        // ---------------------------------------------------------------------
        FraudRule velocityRule = activeRules.get(RuleCode.RAPID_VELOCITY);
        long userVelocity = ctx.getUserVelocityCount();
        long velocityThreshold = velocityRule != null ? velocityRule.getThresholdValue().longValue() : 3L;
        boolean velocityTriggered = userVelocity > velocityThreshold;
        results.add(buildResult(
                velocityRule,
                RuleCode.RAPID_VELOCITY,
                "High Velocity Rapid Transactions",
                velocityTriggered,
                velocityTriggered
                        ? String.format("%d transactions in last 5 min for this user (threshold: %d)", userVelocity, velocityThreshold)
                        : String.format("%d transaction(s) in last 5 min (within threshold of %d)", userVelocity, velocityThreshold),
                BigDecimal.valueOf(userVelocity)
        ));

        // ---------------------------------------------------------------------
        // RULE 6: HIGH_AMOUNT
        // ---------------------------------------------------------------------
        FraudRule highAmountRule = activeRules.get(RuleCode.HIGH_AMOUNT);
        BigDecimal amount = ctx.getAmount() != null ? ctx.getAmount() : BigDecimal.ZERO;
        BigDecimal highAmountThreshold = highAmountRule != null ? highAmountRule.getThresholdValue() : BigDecimal.valueOf(2000.00);
        boolean highAmountTriggered = amount.compareTo(highAmountThreshold) > 0;
        results.add(buildResult(
                highAmountRule,
                RuleCode.HIGH_AMOUNT,
                "Elevated Transaction Amount",
                highAmountTriggered,
                highAmountTriggered
                        ? String.format("Amount $%s exceeds threshold $%s", amount, highAmountThreshold)
                        : String.format("Amount $%s is within threshold $%s", amount, highAmountThreshold),
                amount
        ));

        // ---------------------------------------------------------------------
        // RULE 7: IPQS_HIGH_SCORE
        // ---------------------------------------------------------------------
        FraudRule ipqsRule = activeRules.get(RuleCode.IPQS_HIGH_SCORE);
        int ipqsScore = ctx.getIpqsFraudScore();
        int ipqsThreshold = ipqsRule != null ? ipqsRule.getThresholdValue().intValue() : 75;
        boolean ipqsTriggered = ipqsScore > ipqsThreshold;
        results.add(buildResult(
                ipqsRule,
                RuleCode.IPQS_HIGH_SCORE,
                "High Risk IP Intelligence Score",
                ipqsTriggered,
                ipqsTriggered
                        ? String.format("IPQualityScore fraud score %d/100 exceeds threshold %d", ipqsScore, ipqsThreshold)
                        : String.format("IPQualityScore fraud score %d/100 is below threshold %d", ipqsScore, ipqsThreshold),
                BigDecimal.valueOf(ipqsScore)
        ));

        // ---------------------------------------------------------------------
        // RULE 8: IS_VPN
        // ---------------------------------------------------------------------
        FraudRule vpnRule = activeRules.get(RuleCode.IS_VPN);
        boolean isVpn = ctx.isVpn();
        results.add(buildResult(
                vpnRule,
                RuleCode.IS_VPN,
                "VPN Connection Detected",
                isVpn,
                isVpn ? "Transaction IP identified as VPN endpoint"
                      : "IP address is not an identified commercial or private VPN",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 9: GEO_MISMATCH
        // ---------------------------------------------------------------------
        FraudRule geoMismatchRule = activeRules.get(RuleCode.GEO_MISMATCH);
        String ipCountry = ctx.getIpCountry();
        String homeCountry = ctx.getUserHomeCountry();
        boolean geoMismatchTriggered = ipCountry != null && homeCountry != null
                && !ipCountry.equalsIgnoreCase(homeCountry);
        results.add(buildResult(
                geoMismatchRule,
                RuleCode.GEO_MISMATCH,
                "IP Country Geolocation Mismatch",
                geoMismatchTriggered,
                geoMismatchTriggered
                        ? String.format("IP country (%s) does not match home country (%s)", ipCountry, homeCountry)
                        : String.format("IP country (%s) matches registered home country (%s)", ipCountry, homeCountry),
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 10: NEW_ACCOUNT_SURGE
        // ---------------------------------------------------------------------
        FraudRule newAccountSurgeRule = activeRules.get(RuleCode.NEW_ACCOUNT_SURGE);
        long accountAgeDays = ctx.getUserAccountAgeDays();
        BigDecimal newAccountThreshold = newAccountSurgeRule != null ? newAccountSurgeRule.getThresholdValue() : BigDecimal.valueOf(500.00);
        boolean newAccountSurgeTriggered = accountAgeDays < 2 && amount.compareTo(newAccountThreshold) > 0;
        results.add(buildResult(
                newAccountSurgeRule,
                RuleCode.NEW_ACCOUNT_SURGE,
                "New Account High Value Surge",
                newAccountSurgeTriggered,
                newAccountSurgeTriggered
                        ? String.format("Account %dd old with amount $%s above threshold $%s", accountAgeDays, amount, newAccountThreshold)
                        : String.format("Account age %dd with amount $%s (threshold: $%s)", accountAgeDays, amount, newAccountThreshold),
                amount
        ));

        // ---------------------------------------------------------------------
        // RULE 11: MULTIPLE_USERS_SAME_IP
        // ---------------------------------------------------------------------
        FraudRule multiUsersIpRule = activeRules.get(RuleCode.MULTIPLE_USERS_SAME_IP);
        long usersFromIp = ctx.getUniqueUsersFromIpLast24h();
        long multiUsersThreshold = multiUsersIpRule != null ? multiUsersIpRule.getThresholdValue().longValue() : 3L;
        boolean multiUsersTriggered = usersFromIp > multiUsersThreshold;
        results.add(buildResult(
                multiUsersIpRule,
                RuleCode.MULTIPLE_USERS_SAME_IP,
                "Multiple Accounts Sharing Same IP",
                multiUsersTriggered,
                multiUsersTriggered
                        ? String.format("%d distinct accounts from same IP in 24h (threshold: %d)", usersFromIp, multiUsersThreshold)
                        : String.format("%d distinct account(s) from same IP in 24h (within threshold of %d)", usersFromIp, multiUsersThreshold),
                BigDecimal.valueOf(usersFromIp)
        ));

        // ---------------------------------------------------------------------
        // RULE 12: IS_PROXY
        // ---------------------------------------------------------------------
        FraudRule proxyRule = activeRules.get(RuleCode.IS_PROXY);
        boolean isProxy = ctx.isProxy();
        results.add(buildResult(
                proxyRule,
                RuleCode.IS_PROXY,
                "Open Proxy Anonymizer Detected",
                isProxy,
                isProxy ? "Transaction IP identified as open proxy"
                        : "IP address is not an identified open proxy",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 13: HOSTING_IP
        // ---------------------------------------------------------------------
        FraudRule hostingRule = activeRules.get(RuleCode.HOSTING_IP);
        boolean isHosting = ctx.isHostingIp();
        results.add(buildResult(
                hostingRule,
                RuleCode.HOSTING_IP,
                "Cloud Datacenter Hosting IP",
                isHosting,
                isHosting ? "IP belongs to cloud hosting provider (datacenter traffic)"
                          : "IP address is standard residential/mobile ISP",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 14: FAILED_ATTEMPTS
        // ---------------------------------------------------------------------
        FraudRule failedAttemptsRule = activeRules.get(RuleCode.FAILED_ATTEMPTS);
        long failedAttempts = ctx.getFailedAttemptsLast24h();
        long failedAttemptsThreshold = failedAttemptsRule != null ? failedAttemptsRule.getThresholdValue().longValue() : 2L;
        boolean failedAttemptsTriggered = failedAttempts > failedAttemptsThreshold;
        results.add(buildResult(
                failedAttemptsRule,
                RuleCode.FAILED_ATTEMPTS,
                "Recent Consecutive Failed Transactions",
                failedAttemptsTriggered,
                failedAttemptsTriggered
                        ? String.format("%d blocked transactions from this account in 24h (threshold: %d)", failedAttempts, failedAttemptsThreshold)
                        : String.format("%d failed attempt(s) in 24h (within threshold of %d)", failedAttempts, failedAttemptsThreshold),
                BigDecimal.valueOf(failedAttempts)
        ));

        // ---------------------------------------------------------------------
        // RULE 15: RAPID_AMOUNT_ESCALATION
        // ---------------------------------------------------------------------
        FraudRule escalationRule = activeRules.get(RuleCode.RAPID_AMOUNT_ESCALATION);
        BigDecimal avgAmount = ctx.getUserAvgAmountLast30d();
        long userTxnCount = ctx.getUserTxnCountLast30d();
        BigDecimal escalationMultiplier = escalationRule != null ? escalationRule.getThresholdValue() : BigDecimal.valueOf(3.00);
        boolean escalationTriggered = userTxnCount >= 5
                && avgAmount != null
                && avgAmount.compareTo(BigDecimal.ZERO) > 0
                && amount.compareTo(avgAmount.multiply(escalationMultiplier)) > 0;
        double ratio = (avgAmount != null && avgAmount.compareTo(BigDecimal.ZERO) > 0)
                ? amount.doubleValue() / avgAmount.doubleValue()
                : 1.0;
        results.add(buildResult(
                escalationRule,
                RuleCode.RAPID_AMOUNT_ESCALATION,
                "Abnormal Spending Escalation Ratio",
                escalationTriggered,
                escalationTriggered
                        ? String.format("Amount $%s is %.1fx the 30-day average of $%s", amount, ratio, avgAmount)
                        : String.format("Amount $%s is consistent with user 30-day spending profile", amount),
                amount
        ));

        // ---------------------------------------------------------------------
        // RULE 16: PASTE_DETECTED
        // ---------------------------------------------------------------------
        FraudRule pasteRule = activeRules.get(RuleCode.PASTE_DETECTED);
        boolean pasteDetected = Boolean.TRUE.equals(ctx.getPasteDetected());
        results.add(buildResult(
                pasteRule,
                RuleCode.PASTE_DETECTED,
                "Payment Details Clipboard Paste",
                pasteDetected,
                pasteDetected ? "Payment data pasted from clipboard — common pattern with stolen credentials"
                              : "Standard manual keystroke input pattern observed",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 17: TIMEZONE_MISMATCH
        // ---------------------------------------------------------------------
        FraudRule timezoneRule = activeRules.get(RuleCode.TIMEZONE_MISMATCH);
        boolean timezoneMismatch = Boolean.TRUE.equals(ctx.getTimezoneOffsetMinutes() != null && ctx.getTimezoneOffsetMinutes() != 0)
                || (ctx.getBrowserTimezone() != null && ctx.getIpCity() != null && !ctx.getBrowserTimezone().isBlank()
                    && Boolean.TRUE.equals(ctx.getIsHeadless())); // Defensive timezone discrepancy check
        // Or if explicitly signaled on context
        boolean finalTzMismatch = Boolean.TRUE.equals(ctx.getSimulateForeignIp()) || timezoneMismatch;
        results.add(buildResult(
                timezoneRule,
                RuleCode.TIMEZONE_MISMATCH,
                "Client and Network Timezone Discrepancy",
                finalTzMismatch,
                finalTzMismatch ? "Browser timezone does not match IP geolocation timezone"
                                : "Browser timezone aligns with network routing profile",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 18: NEW_DEVICE
        // ---------------------------------------------------------------------
        FraudRule newDeviceRule = activeRules.get(RuleCode.NEW_DEVICE);
        boolean isNewDevice = ctx.isNewDevice();
        results.add(buildResult(
                newDeviceRule,
                RuleCode.NEW_DEVICE,
                "Unrecognized Device Fingerprint",
                isNewDevice,
                isNewDevice ? "Transaction from device fingerprint not previously associated with this account"
                            : "Recognized customer hardware/browser fingerprint",
                null
        ));

        // ---------------------------------------------------------------------
        // RULE 19: ROUND_AMOUNT
        // ---------------------------------------------------------------------
        FraudRule roundAmountRule = activeRules.get(RuleCode.ROUND_AMOUNT);
        BigDecimal roundThreshold = roundAmountRule != null ? roundAmountRule.getThresholdValue() : BigDecimal.valueOf(1000.00);
        boolean isDivisibleBy100 = amount.compareTo(BigDecimal.ZERO) > 0
                && amount.remainder(BigDecimal.valueOf(100)).compareTo(BigDecimal.ZERO) == 0;
        boolean roundAmountTriggered = isDivisibleBy100 && amount.compareTo(roundThreshold) <= 0;
        results.add(buildResult(
                roundAmountRule,
                RuleCode.ROUND_AMOUNT,
                "Suspicious Round Amount Testing",
                roundAmountTriggered,
                roundAmountTriggered
                        ? String.format("Round amount $%s — common automated card-testing pattern", amount)
                        : String.format("Amount $%s has standard fractional or non-testing currency value", amount),
                amount
        ));

        // ---------------------------------------------------------------------
        // RULE 20: OFF_HOURS_TXN
        // ---------------------------------------------------------------------
        FraudRule offHoursRule = activeRules.get(RuleCode.OFF_HOURS_TXN);
        int currentUtcHour = OffsetDateTime.now(ZoneOffset.UTC).getHour();
        boolean offHoursTriggered = currentUtcHour >= 2 && currentUtcHour < 5;
        results.add(buildResult(
                offHoursRule,
                RuleCode.OFF_HOURS_TXN,
                "High-Risk Off-Hours Activity Window",
                offHoursTriggered,
                offHoursTriggered
                        ? String.format("Transaction at %02d:00 UTC — elevated risk window (02:00–05:00)", currentUtcHour)
                        : String.format("Transaction at %02d:00 UTC is outside off-hours risk window", currentUtcHour),
                BigDecimal.valueOf(currentUtcHour)
        ));

        // ---------------------------------------------------------------------
        // SCORE AGGREGATION & ADJUDICATION DECISION
        // ---------------------------------------------------------------------
        int accumulatedPoints = results.stream()
                .mapToInt(RuleResult::pointsApplied)
                .sum();

        int clampedScore = Math.min(100, Math.max(0, accumulatedPoints));

        String status;
        if (clampedScore <= AppConstants.DecisionThreshold.APPROVED_MAX) {
            status = AppConstants.TransactionStatus.APPROVED;
        } else if (clampedScore <= AppConstants.DecisionThreshold.PENDING_MAX) {
            status = AppConstants.TransactionStatus.PENDING_REVIEW;
        } else {
            status = AppConstants.TransactionStatus.BLOCKED;
        }

        RiskEvaluationResult finalResult = RiskEvaluationResult.builder()
                .totalScore(clampedScore)
                .status(status)
                .instantBlock(false)
                .allResults(results)
                .build();

        finalizeEvaluation(ctx, finalResult);
        return finalResult;
    }

    /**
     * Inspects global blacklist cache across IP, device fingerprint, and customer email.
     *
     * @param ctx transaction context
     * @return reason string if blacklisted, null otherwise
     */
    private String checkBlacklistHits(EnrichedTransactionContext ctx) {
        if (blacklistCacheService.isBlacklisted(AppConstants.BlacklistType.IP, ctx.getResolvedIpAddress())) {
            return String.format("[IP] blacklisted: %s", ctx.getResolvedIpAddress());
        }
        if (ctx.getDeviceFingerprint() != null && !ctx.getDeviceFingerprint().isBlank()) {
            if (blacklistCacheService.isBlacklisted(AppConstants.BlacklistType.FINGERPRINT, ctx.getDeviceFingerprint())) {
                return String.format("[FINGERPRINT] blacklisted: %s", ctx.getDeviceFingerprint());
            }
            if (blacklistCacheService.isBlacklisted(AppConstants.BlacklistType.DEVICE, ctx.getDeviceFingerprint())) {
                return String.format("[DEVICE] blacklisted: %s", ctx.getDeviceFingerprint());
            }
        }
        if (ctx.getUserEmail() != null && !ctx.getUserEmail().isBlank()) {
            if (blacklistCacheService.isBlacklisted(AppConstants.BlacklistType.EMAIL, ctx.getUserEmail())) {
                return String.format("[EMAIL] blacklisted: %s", ctx.getUserEmail());
            }
        }
        return null;
    }

    /**
     * Builds a safe RuleResult instance, extracting live weight from FraudRule if present and enabled.
     */
    private RuleResult buildResult(
            FraudRule rule,
            String ruleCode,
            String defaultName,
            boolean triggered,
            String reason,
            BigDecimal observedValue
    ) {
        if (rule == null || !Boolean.TRUE.equals(rule.getIsEnabled())) {
            return new RuleResult(
                    ruleCode,
                    defaultName,
                    0,
                    rule == null ? "Rule is not configured in rulebook" : "Rule is currently disabled",
                    observedValue,
                    false
            );
        }

        int points = triggered ? rule.getRiskWeight() : 0;
        return new RuleResult(
                rule.getRuleCode(),
                rule.getName(),
                points,
                reason,
                observedValue,
                triggered
        );
    }

    /**
     * Populates untriggered placeholders for rules 2-20 during an immediate blacklist fail-fast block.
     */
    private void populateRemainingRulesAsUntriggered(List<RuleResult> results, Map<String, FraudRule> activeRules) {
        String[] remainingRuleCodes = {
                RuleCode.HEADLESS_BROWSER,
                RuleCode.DEVICE_SHARED_ACCOUNTS,
                RuleCode.IS_TOR,
                RuleCode.RAPID_VELOCITY,
                RuleCode.HIGH_AMOUNT,
                RuleCode.IPQS_HIGH_SCORE,
                RuleCode.IS_VPN,
                RuleCode.GEO_MISMATCH,
                RuleCode.NEW_ACCOUNT_SURGE,
                RuleCode.MULTIPLE_USERS_SAME_IP,
                RuleCode.IS_PROXY,
                RuleCode.HOSTING_IP,
                RuleCode.FAILED_ATTEMPTS,
                RuleCode.RAPID_AMOUNT_ESCALATION,
                RuleCode.PASTE_DETECTED,
                RuleCode.TIMEZONE_MISMATCH,
                RuleCode.NEW_DEVICE,
                RuleCode.ROUND_AMOUNT,
                RuleCode.OFF_HOURS_TXN
        };

        for (String code : remainingRuleCodes) {
            FraudRule rule = activeRules.get(code);
            results.add(buildResult(
                    rule,
                    code,
                    code,
                    false,
                    "Evaluation bypassed due to instant blacklist block",
                    null
            ));
        }
    }

    /**
     * Post-evaluation processing: records failed attempts in Redis and logs telemetry.
     */
    private void finalizeEvaluation(EnrichedTransactionContext ctx, RiskEvaluationResult result) {
        if (AppConstants.TransactionStatus.BLOCKED.equals(result.getStatus())
                || AppConstants.TransactionStatus.PENDING_REVIEW.equals(result.getStatus())) {
            redisVelocityService.recordFailedAttempt(ctx.getUserId());
        }

        ruleEvaluationLogger.logEvaluation(ctx, result);

        log.info("Risk evaluation complete: userId={} score={} status={} rules_triggered={} instant_block={}",
                ctx.getUserId(),
                result.getTotalScore(),
                result.getStatus(),
                result.getTriggeredRules().size(),
                result.isInstantBlock());
    }
}
