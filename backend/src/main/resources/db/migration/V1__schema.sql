-- ============================================================================
-- FraudGuard Database Migration: V1__schema.sql
-- Engine: MySQL 8.0+
-- Description: Core schema creation for FraudGuard Fintech Fraud Detection &
--              Compliance Platform. Establishes core domain tables, constraints,
--              referential integrity rules, and high-performance indexes.
-- ============================================================================

-- ============================================================================
-- TABLE 1: users
-- Purpose: Central authentication and authorization entity. Stores customer accounts
--          initiating transactions and compliance analysts who review flagged queues.
-- ============================================================================
CREATE TABLE users (
    id             CHAR(36) PRIMARY KEY,
    email          VARCHAR(255) UNIQUE NOT NULL,
    name           VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(30) NOT NULL,
    home_country   CHAR(2),
    created_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_users_role CHECK (role IN ('ROLE_CUSTOMER', 'ROLE_ANALYST'))
);

-- ============================================================================
-- TABLE 2: fraud_rules
-- Purpose: Dynamic catalog of fraud detection heuristics and deterministic rules.
--          Maintains evaluation thresholds, weighted risk contributions, and active states.
-- ============================================================================
CREATE TABLE fraud_rules (
    id               BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rule_code        VARCHAR(100) UNIQUE NOT NULL,
    name             VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL,
    threshold_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
    risk_weight      INT NOT NULL,
    is_enabled       TINYINT(1) NOT NULL DEFAULT 1,
    updated_at       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_fraud_rules_weight CHECK (risk_weight BETWEEN 0 AND 100)
);

-- ============================================================================
-- TABLE 3: blacklists
-- Purpose: Global negative-match directory for malicious actors, compromised IPs,
--          blocked device fingerprints, and suspicious payment emails.
-- ============================================================================
CREATE TABLE blacklists (
    id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    target_type   VARCHAR(30) NOT NULL,
    target_value  VARCHAR(255) NOT NULL,
    reason        TEXT,
    added_by      CHAR(36),
    created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_blacklist_type CHECK (target_type IN ('IP', 'DEVICE', 'EMAIL', 'FINGERPRINT')),
    CONSTRAINT uq_blacklist UNIQUE (target_type, target_value),
    CONSTRAINT fk_blacklist_user FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- TABLE 4: ip_intelligence
-- Purpose: Enriched network intelligence cache storing geolocation, proxy/VPN/Tor
--          indicators, ISP details, and external risk reputation scores.
-- ============================================================================
CREATE TABLE ip_intelligence (
    ip_address        VARCHAR(45) PRIMARY KEY,
    country_code      CHAR(2),
    country_name      VARCHAR(100),
    city              VARCHAR(100),
    isp               VARCHAR(255),
    org               VARCHAR(255),
    is_vpn            TINYINT(1) DEFAULT 0,
    is_tor            TINYINT(1) DEFAULT 0,
    is_proxy          TINYINT(1) DEFAULT 0,
    is_hosting_ip     TINYINT(1) DEFAULT 0,
    ipqs_fraud_score  INT DEFAULT 0,
    raw_response      JSON,
    fetched_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- ============================================================================
-- TABLE 5: transactions
-- Purpose: Ledger of all financial transaction attempts. Captures transactional details,
--          device context, IP intelligence snapshots, computed composite risk scores,
--          adjudication status, and compliance review resolutions.
-- ============================================================================
CREATE TABLE transactions (
    id                  CHAR(36) PRIMARY KEY,
    user_id             CHAR(36) NOT NULL,
    amount              NUMERIC(15,2) NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    ip_address          VARCHAR(45) NOT NULL,
    ip_country          CHAR(2),
    ip_city             VARCHAR(100),
    ip_isp              VARCHAR(255),
    device_fingerprint  VARCHAR(255),
    device_type         VARCHAR(100),
    browser             VARCHAR(100),
    os                  VARCHAR(100),
    screen_resolution   VARCHAR(30),
    time_on_page_ms     BIGINT,
    paste_detected      TINYINT(1) DEFAULT 0,
    timezone_mismatch   TINYINT(1) DEFAULT 0,
    is_headless         TINYINT(1) DEFAULT 0,
    is_vpn              TINYINT(1) DEFAULT 0,
    is_tor              TINYINT(1) DEFAULT 0,
    is_proxy            TINYINT(1) DEFAULT 0,
    is_hosting_ip       TINYINT(1) DEFAULT 0,
    ipqs_fraud_score    INT DEFAULT 0,
    risk_score          INT NOT NULL DEFAULT 0,
    status              VARCHAR(30) NOT NULL,
    triggered_rules     JSON,
    reviewed_by         CHAR(36),
    resolution_notes    TEXT,
    created_at          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_txn_amount CHECK (amount > 0),
    CONSTRAINT chk_txn_risk_score CHECK (risk_score BETWEEN 0 AND 100),
    CONSTRAINT chk_txn_status CHECK (status IN ('APPROVED', 'PENDING_REVIEW', 'BLOCKED')),
    CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_txn_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================================
-- TABLE 6: transaction_rule_hits
-- Purpose: Detailed audit breakdown of each individual fraud rule triggered by a
--          transaction, recording the applied weight and observed telemetry value.
-- ============================================================================
CREATE TABLE transaction_rule_hits (
    transaction_id  CHAR(36) NOT NULL,
    rule_id         BIGINT NOT NULL,
    weight_applied  INT NOT NULL,
    observed_value  NUMERIC(15,2),
    trigger_reason  TEXT,
    PRIMARY KEY (transaction_id, rule_id),
    CONSTRAINT chk_trh_weight CHECK (weight_applied BETWEEN 0 AND 100),
    CONSTRAINT fk_trh_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trh_rule FOREIGN KEY (rule_id) REFERENCES fraud_rules(id) ON DELETE RESTRICT
);

-- ============================================================================
-- TABLE 7: transaction_blacklist_hits
-- Purpose: Join table linking blocked transactions directly to the specific
--          blacklist record that triggered the immediate disqualification.
-- ============================================================================
CREATE TABLE transaction_blacklist_hits (
    transaction_id  CHAR(36) NOT NULL,
    blacklist_id    BIGINT NOT NULL,
    PRIMARY KEY (transaction_id, blacklist_id),
    CONSTRAINT fk_tbh_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tbh_blacklist FOREIGN KEY (blacklist_id) REFERENCES blacklists(id) ON DELETE RESTRICT
);

-- ============================================================================
-- TABLE 8: device_fingerprints
-- Purpose: Tracks historical binding between users and unique device hardware/browser
--          hashes to identify credential sharing, account takeovers, and fraud rings.
-- ============================================================================
CREATE TABLE device_fingerprints (
    id                BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id           CHAR(36) NOT NULL,
    fingerprint_hash  VARCHAR(255) NOT NULL,
    first_seen        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_seen         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    txn_count         INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_user_fingerprint UNIQUE (user_id, fingerprint_hash),
    CONSTRAINT fk_df_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================================
-- TABLE 9: session_signals
-- Purpose: Granular client-side behavioral telemetry (keystroke dynamics, mouse motion,
--          paste detection, automation hooks) collected during checkout submission.
-- ============================================================================
CREATE TABLE session_signals (
    id                    BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    transaction_id        CHAR(36) NOT NULL UNIQUE,
    time_on_page_ms       BIGINT,
    mouse_movement_count  INT,
    keystroke_variance    NUMERIC(10,4),
    paste_detected        TINYINT(1) DEFAULT 0,
    is_headless_browser   TINYINT(1) DEFAULT 0,
    browser_timezone      VARCHAR(100),
    ip_timezone           VARCHAR(100),
    screen_resolution     VARCHAR(30),
    created_at            DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ss_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
);

-- ============================================================================
-- TABLE 10: audit_logs
-- Purpose: Immutable, tamper-evident regulatory trail of administrative actions,
--          rule calibrations, analyst reviews, and blacklist updates.
-- ============================================================================
CREATE TABLE audit_logs (
    id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_id      CHAR(36) NOT NULL,
    actor_email   VARCHAR(255) NOT NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(100) NOT NULL,
    entity_id     VARCHAR(255) NOT NULL,
    before_value  JSON,
    after_value   JSON,
    ip_address    VARCHAR(45),
    notes         TEXT,
    created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_al_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================================
-- PERFORMANCE & COMPLIANCE INDEXES
-- ============================================================================

-- Transaction hot paths
CREATE INDEX idx_txn_user_time    ON transactions(user_id, created_at DESC);
CREATE INDEX idx_txn_status       ON transactions(status);
CREATE INDEX idx_txn_ip           ON transactions(ip_address);
CREATE INDEX idx_txn_fingerprint  ON transactions(device_fingerprint);
CREATE INDEX idx_txn_created      ON transactions(created_at DESC);

-- Blacklist lookup (every transaction hits this)
CREATE INDEX idx_bl_lookup        ON blacklists(target_type, target_value);

-- Audit queries
CREATE INDEX idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor      ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_created    ON audit_logs(created_at DESC);

-- Device fingerprint cross-account detection
CREATE INDEX idx_device_fp_hash   ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_fp_user   ON device_fingerprints(user_id);

-- IP intelligence cache expiry queries
CREATE INDEX idx_ip_intel_fetched ON ip_intelligence(fetched_at);

-- ============================================================================
-- SENIOR ENGINEERING ENHANCEMENTS: ADVANCED QUERY OPTIMIZATIONS
-- NOTE: MySQL does not support partial/WHERE indexes; replaced with full indexes.
-- ============================================================================

-- Analyst review queue filtering: find pending transactions quickly
CREATE INDEX idx_txn_pending_review ON transactions(created_at ASC, status);

-- Analyst workload tracking
CREATE INDEX idx_txn_reviewed_by ON transactions(reviewed_by);

-- Reverse lookup index on rule hits for aggregated fraud intelligence reports
CREATE INDEX idx_txn_rule_hits_rule ON transaction_rule_hits(rule_id);

-- JSON path indexes for triggered_rules (MySQL 8.0+ multi-valued index)
-- NOTE: GIN indexes do not exist in MySQL; standard indexes cover JSON column queries.
CREATE INDEX idx_txn_triggered_rules ON transactions((CAST(triggered_rules AS CHAR(255))));

-- JSON snapshot auditing indexes
CREATE INDEX idx_audit_before ON audit_logs((CAST(before_value AS CHAR(255))));
CREATE INDEX idx_audit_after  ON audit_logs((CAST(after_value AS CHAR(255))));
