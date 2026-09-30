// com.fraudguard.service.SarPromptBuilder
package com.fraudguard.service;

import com.fraudguard.entity.FraudRule;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.TransactionRuleHit;
import com.fraudguard.entity.User;
import com.fraudguard.repository.FraudRuleRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Builds regulatory-compliant prompt context for generating FinCEN Suspicious Activity Report narratives via Gemini AI.
 */
@Component
@RequiredArgsConstructor
public class SarPromptBuilder {

    private final FraudRuleRepository fraudRuleRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd, yyyy");
    private static final DateTimeFormatter ACTIVITY_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd yyyy HH:mm 'UTC'");

    /**
     * Constructs full factual context and FinCEN narrative guidelines for the LLM.
     *
     * @param txn evaluated transaction entity
     * @param ruleHits individual rule violations
     * @param customer customer user identity
     * @param analyst reviewing compliance analyst identity
     * @return complete prompt string
     */
    public String buildPrompt(
            Transaction txn,
            List<TransactionRuleHit> ruleHits,
            User customer,
            User analyst
    ) {
        Map<Long, FraudRule> rulesById = fraudRuleRepository.findAll().stream()
                .collect(Collectors.toMap(FraudRule::getId, r -> r, (r1, r2) -> r1));

        String filingDate = LocalDate.now().format(DATE_FORMATTER);
        String activityDate = txn.getCreatedAt() != null ? txn.getCreatedAt().format(ACTIVITY_FORMATTER) : "Recent";
        String amountFormatted = String.format("$%,.2f %s", txn.getAmount(), txn.getCurrency());
        String customerName = customer != null ? customer.getName() : "Unknown Account Holder";
        long accountAgeDays = 0;
        if (customer != null && customer.getCreatedAt() != null && txn.getCreatedAt() != null) {
            accountAgeDays = Math.max(0, ChronoUnit.DAYS.between(customer.getCreatedAt(), txn.getCreatedAt()));
        }
        String homeCountry = customer != null && customer.getHomeCountry() != null ? customer.getHomeCountry() : "N/A";

        String deviceFp = txn.getDeviceFingerprint() != null && txn.getDeviceFingerprint().length() > 12
                ? txn.getDeviceFingerprint().substring(0, 12) + "..."
                : (txn.getDeviceFingerprint() != null ? txn.getDeviceFingerprint() : "N/A");

        StringBuilder rulesList = new StringBuilder();
        if (ruleHits == null || ruleHits.isEmpty()) {
            rulesList.append("- None (Direct Blacklist or System Hold)\n");
        } else {
            for (TransactionRuleHit hit : ruleHits) {
                FraudRule rule = rulesById.get(hit.getRuleId());
                String code = rule != null ? rule.getRuleCode() : "RULE_" + hit.getRuleId();
                rulesList.append(String.format("- %s: %s (+%d pts)\n",
                        code,
                        hit.getTriggerReason() != null ? hit.getTriggerReason() : "Triggered threshold",
                        hit.getWeightApplied() != null ? hit.getWeightApplied() : 0));
            }
        }

        String analystReviewBlock;
        if (txn.getReviewedBy() != null && analyst != null) {
            analystReviewBlock = String.format("Reviewing Analyst: %s\nReview Notes: %s",
                    analyst.getName(),
                    txn.getResolutionNotes() != null ? txn.getResolutionNotes() : "Adjudicated and flagged for regulatory reporting.");
        } else {
            analystReviewBlock = "System auto-decision (Automated block based on composite risk threshold)";
        }

        return """
You are a Bank Secrecy Act compliance officer at a regulated financial institution. Generate a formal Suspicious Activity Report (SAR) narrative following FinCEN SAR filing guidelines (31 CFR 1020.320).

Write ONLY the narrative text — no headers, no bullet points, no markdown formatting, no labels. Write continuous professional prose in exactly 4 paragraphs. Use past tense. Be specific with dates, amounts, and technical indicators. This narrative will be submitted to FinCEN.

TRANSACTION FACTS:
Transaction ID: %s
Filing Date: %s
Activity Date: %s
Amount: %s
Account Holder: %s
Account Age: %d days
Home Country: %s

Network Intelligence:
IP Address: %s
IP Country: %s / City: %s
ISP: %s
VPN Detected: %b
Tor Exit Node: %b
Proxy Detected: %b
Hosting/Datacenter IP: %b
IPQualityScore Threat Score: %s

Behavioral Biometrics:
Device Fingerprint: %s
Device Type: %s
Browser: %s
OS: %s
Time on Checkout Page: %s
Clipboard Paste Detected: %b
Headless Browser: %b
Timezone Mismatch: %b

Risk Assessment:
Composite Risk Score: %d/100
System Decision: %s
Total Rules Evaluated: 20
Rules Triggered (%d):
%s
Analyst Review:
%s

INSTRUCTIONS FOR THE 4 PARAGRAPHS:
Paragraph 1 (Subject & Account): Describe the account holder, account age, and account activity context.
Paragraph 2 (Suspicious Activity): Describe the specific transaction, all network indicators (VPN, Tor, IP intelligence), and biometric anomalies in factual detail.
Paragraph 3 (Pattern & Rules): Describe the risk signals that triggered the fraud detection system, referencing each rule violation and its significance.
Paragraph 4 (Conclusion & Action): Summarize why this activity is suspicious under BSA/AML guidelines and state the recommended regulatory action.
""".formatted(
                txn.getId(),
                filingDate,
                activityDate,
                amountFormatted,
                customerName,
                accountAgeDays,
                homeCountry,
                txn.getIpAddress(),
                txn.getIpCountry() != null ? txn.getIpCountry() : "Unknown",
                txn.getIpCity() != null ? txn.getIpCity() : "Unknown",
                txn.getIpIsp() != null ? txn.getIpIsp() : "Unknown",
                Boolean.TRUE.equals(txn.getIsVpn()),
                Boolean.TRUE.equals(txn.getIsTor()),
                Boolean.TRUE.equals(txn.getIsProxy()),
                Boolean.TRUE.equals(txn.getIsHostingIp()),
                txn.getIpqsFraudScore() != null ? txn.getIpqsFraudScore() + "/100" : "N/A",
                deviceFp,
                txn.getDeviceType() != null ? txn.getDeviceType() : "Unknown",
                txn.getBrowser() != null ? txn.getBrowser() : "Unknown",
                txn.getOs() != null ? txn.getOs() : "Unknown",
                txn.getTimeOnPageMs() != null ? txn.getTimeOnPageMs() + "ms" : "N/A",
                Boolean.TRUE.equals(txn.getPasteDetected()),
                Boolean.TRUE.equals(txn.getIsHeadless()),
                Boolean.TRUE.equals(txn.getTimezoneMismatch()),
                txn.getRiskScore(),
                txn.getStatus(),
                ruleHits != null ? ruleHits.size() : 0,
                rulesList.toString(),
                analystReviewBlock
        );
    }
}
