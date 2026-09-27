// com.fraudguard.constant.AppConstants
package com.fraudguard.constant;

/**
 * Global constant definitions for FraudGuard platform domain logic, cache keys,
 * messaging channels, rule codes, and security policies.
 */
public final class AppConstants {

    private AppConstants() {
        // Prevent instantiation of static constants utility class
    }

    /**
     * Canonical rule codes corresponding to the 20 fraud detection heuristics.
     */
    public static final class RuleCode {
        private RuleCode() {}

        public static final String BLACKLIST_MATCH = "BLACKLIST_MATCH";
        public static final String HEADLESS_BROWSER = "HEADLESS_BROWSER";
        public static final String DEVICE_SHARED_ACCOUNTS = "DEVICE_SHARED_ACCOUNTS";
        public static final String IS_TOR = "IS_TOR";
        public static final String RAPID_VELOCITY = "RAPID_VELOCITY";
        public static final String HIGH_AMOUNT = "HIGH_AMOUNT";
        public static final String IPQS_HIGH_SCORE = "IPQS_HIGH_SCORE";
        public static final String IS_VPN = "IS_VPN";
        public static final String GEO_MISMATCH = "GEO_MISMATCH";
        public static final String NEW_ACCOUNT_SURGE = "NEW_ACCOUNT_SURGE";
        public static final String MULTIPLE_USERS_SAME_IP = "MULTIPLE_USERS_SAME_IP";
        public static final String IS_PROXY = "IS_PROXY";
        public static final String HOSTING_IP = "HOSTING_IP";
        public static final String FAILED_ATTEMPTS = "FAILED_ATTEMPTS";
        public static final String RAPID_AMOUNT_ESCALATION = "RAPID_AMOUNT_ESCALATION";
        public static final String PASTE_DETECTED = "PASTE_DETECTED";
        public static final String TIMEZONE_MISMATCH = "TIMEZONE_MISMATCH";
        public static final String NEW_DEVICE = "NEW_DEVICE";
        public static final String ROUND_AMOUNT = "ROUND_AMOUNT";
        public static final String OFF_HOURS_TXN = "OFF_HOURS_TXN";
    }

    /**
     * Cache key prefixes for Redis in-memory storage.
     */
    public static final class RedisPrefixes {
        private RedisPrefixes() {}

        public static final String VELOCITY_USER = "fg:vel:user:";
        public static final String VELOCITY_IP = "fg:vel:ip:";
        public static final String BLACKLIST = "fg:bl:";
        public static final String RULES_ACTIVE = "fg:rules:active";
        public static final String IPQS_CACHE = "fg:ipqs:";
        public static final String IPAPI_CACHE = "fg:ipapi:";
        public static final String FAILED_ATTEMPTS = "fg:fail:";
    }

    /**
     * Kafka topics for asynchronous pipeline messaging.
     */
    public static final class KafkaTopics {
        private KafkaTopics() {}

        public static final String TXN_RAW = "fraudguard.txn.raw";
        public static final String TXN_DECIDED = "fraudguard.txn.decided";
        public static final String AUDIT_EVENTS = "fraudguard.audit.events";
        public static final String TXN_RAW_DLT = "fraudguard.txn.raw.DLT";
        public static final String AUDIT_EVENTS_DLT = "fraudguard.audit.events.DLT";
    }

    /**
     * Adjudication states for transactions.
     */
    public static final class TransactionStatus {
        private TransactionStatus() {}

        public static final String APPROVED = "APPROVED";
        public static final String PENDING_REVIEW = "PENDING_REVIEW";
        public static final String BLOCKED = "BLOCKED";
    }

    /**
     * Authorization role identifiers.
     */
    public static final class UserRole {
        private UserRole() {}

        public static final String ROLE_CUSTOMER = "ROLE_CUSTOMER";
        public static final String ROLE_ANALYST = "ROLE_ANALYST";
    }

    /**
     * Audit log action classifications.
     */
    public static final class AuditAction {
        private AuditAction() {}

        public static final String RULE_UPDATED = "RULE_UPDATED";
        public static final String BLACKLIST_ADDED = "BLACKLIST_ADDED";
        public static final String BLACKLIST_REMOVED = "BLACKLIST_REMOVED";
        public static final String TXN_ADJUDICATED = "TXN_ADJUDICATED";
        public static final String TXN_APPROVED = "TXN_APPROVED";
        public static final String TXN_BLOCKED = "TXN_BLOCKED";
    }

    /**
     * Blacklist target entity types.
     */
    public static final class BlacklistType {
        private BlacklistType() {}

        public static final String IP = "IP";
        public static final String DEVICE = "DEVICE";
        public static final String EMAIL = "EMAIL";
        public static final String FINGERPRINT = "FINGERPRINT";
    }

    /**
     * Composite risk score threshold boundaries.
     */
    public static final class DecisionThreshold {
        private DecisionThreshold() {}

        public static final int APPROVED_MAX = 29;
        public static final int PENDING_MAX = 69;
    }
}
