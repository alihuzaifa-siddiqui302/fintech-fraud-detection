-- ============================================================================
-- FraudGuard Database Migration: V1__schema.sql
-- Engine: PostgreSQL 16+
-- Description: Core schema creation for FraudGuard Fintech Fraud Detection &
--              Compliance Platform. Establishes core domain tables, constraints,
--              referential integrity rules, and high-performance indexes.
-- ============================================================================

-- Ensure cryptographic extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE 1: users
-- Purpose: Central authentication and authorization entity. Stores customer accounts
--          initiating transactions and compliance analysts who review flagged queues.
-- ============================================================================
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) UNIQUE NOT NULL,
    name           VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(30) NOT NULL CHECK (role IN ('ROLE_CUSTOMER', 'ROLE_ANALYST')),
    home_country   CHAR(2),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: fraud_rules
-- Purpose: Dynamic catalog of fraud detection heuristics and deterministic rules.
--          Maintains evaluation thresholds, weighted risk contributions, and active states.
-- ============================================================================
CREATE TABLE fraud_rules (
    id               BIGSERIAL PRIMARY KEY,
    rule_code        VARCHAR(100) UNIQUE NOT NULL,
    name             VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL,
    threshold_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
    risk_weight      INT NOT NULL CHECK (risk_weight BETWEEN 0 AND 100),
    is_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 3: blacklists
-- Purpose: Global negative-match directory for malicious actors, compromised IPs,
--          blocked device fingerprints, and suspicious payment emails.
-- ============================================================================
CREATE TABLE blacklists (
    id            BIGSERIAL PRIMARY KEY,
    target_type   VARCHAR(30) NOT NULL CHECK (target_type IN ('IP', 'DEVICE', 'EMAIL', 'FINGERPRINT')),
    target_value  VARCHAR(255) NOT NULL,
    reason        TEXT,
    added_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_blacklist UNIQUE (target_type, target_value)
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
    is_vpn            BOOLEAN DEFAULT FALSE,
    is_tor            BOOLEAN DEFAULT FALSE,
    is_proxy          BOOLEAN DEFAULT FALSE,
    is_hosting_ip     BOOLEAN DEFAULT FALSE,
    ipqs_fraud_score  INT DEFAULT 0,
    raw_response      JSONB,
    fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 5: transactions
-- Purpose: Ledger of all financial transaction attempts. Captures transactional details,
--          device context, IP intelligence snapshots, computed composite risk scores,
--          adjudication status, and compliance review resolutions.
-- ============================================================================
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
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
    paste_detected      BOOLEAN DEFAULT FALSE,
    timezone_mismatch   BOOLEAN DEFAULT FALSE,
    is_headless         BOOLEAN DEFAULT FALSE,
    is_vpn              BOOLEAN DEFAULT FALSE,
    is_tor              BOOLEAN DEFAULT FALSE,
    is_proxy            BOOLEAN DEFAULT FALSE,
    is_hosting_ip       BOOLEAN DEFAULT FALSE,
    ipqs_fraud_score    INT DEFAULT 0,
    risk_score          INT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    status              VARCHAR(30) NOT NULL CHECK (status IN ('APPROVED', 'PENDING_REVIEW', 'BLOCKED')),
    triggered_rules     JSONB,
    reviewed_by         UUID REFERENCES users(id) ON DELETE RESTRICT,
    resolution_notes    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 6: transaction_rule_hits
-- Purpose: Detailed audit breakdown of each individual fraud rule triggered by a
--          transaction, recording the applied weight and observed telemetry value.
-- ============================================================================
CREATE TABLE transaction_rule_hits (
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    rule_id         BIGINT NOT NULL REFERENCES fraud_rules(id) ON DELETE RESTRICT,
    weight_applied  INT NOT NULL CHECK (weight_applied BETWEEN 0 AND 100),
    observed_value  NUMERIC(15,2),
    trigger_reason  TEXT,
    PRIMARY KEY (transaction_id, rule_id)
);

-- ============================================================================
-- TABLE 7: transaction_blacklist_hits
-- Purpose: Join table linking blocked transactions directly to the specific
--          blacklist record that triggered the immediate disqualification.
-- ============================================================================
CREATE TABLE transaction_blacklist_hits (
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    blacklist_id    BIGINT NOT NULL REFERENCES blacklists(id) ON DELETE RESTRICT,
    PRIMARY KEY (transaction_id, blacklist_id)
);

-- ============================================================================
-- TABLE 8: device_fingerprints
-- Purpose: Tracks historical binding between users and unique device hardware/browser
--          hashes to identify credential sharing, account takeovers, and fraud rings.
-- ============================================================================
CREATE TABLE device_fingerprints (
    id                BIGSERIAL PRIMARY KEY,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    fingerprint_hash  VARCHAR(255) NOT NULL,
    first_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    txn_count         INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_user_fingerprint UNIQUE (user_id, fingerprint_hash)
);

-- ============================================================================
-- TABLE 9: session_signals
-- Purpose: Granular client-side behavioral telemetry (keystroke dynamics, mouse motion,
--          paste detection, automation hooks) collected during checkout submission.
-- ============================================================================
CREATE TABLE session_signals (
    id                    BIGSERIAL PRIMARY KEY,
    transaction_id        UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
    time_on_page_ms       BIGINT,
    mouse_movement_count  INT,
    keystroke_variance    NUMERIC(10,4),
    paste_detected        BOOLEAN DEFAULT FALSE,
    is_headless_browser   BOOLEAN DEFAULT FALSE,
    browser_timezone      VARCHAR(100),
    ip_timezone           VARCHAR(100),
    screen_resolution     VARCHAR(30),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 10: audit_logs
-- Purpose: Immutable, tamper-evident regulatory trail of administrative actions,
--          rule calibrations, analyst reviews, and blacklist updates.
-- ============================================================================
CREATE TABLE audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    actor_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    actor_email   VARCHAR(255) NOT NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(100) NOT NULL,
    entity_id     VARCHAR(255) NOT NULL,
    before_value  JSONB,
    after_value   JSONB,
    ip_address    VARCHAR(45),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- ============================================================================

-- Fast analyst review queue filtering: find unreviewed pending transactions quickly
CREATE INDEX idx_txn_pending_review ON transactions(created_at ASC) WHERE status = 'PENDING_REVIEW';

-- Partial index for analyst workload tracking
CREATE INDEX idx_txn_reviewed_by ON transactions(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Reverse lookup index on rule hits for aggregated fraud intelligence reports
CREATE INDEX idx_txn_rule_hits_rule ON transaction_rule_hits(rule_id);

-- GIN index for high-speed containment and existence queries on triggered rule JSONB payloads
CREATE INDEX idx_txn_triggered_rules_gin ON transactions USING gin (triggered_rules);

-- GIN indexes for JSONB before/after snapshot auditing
CREATE INDEX idx_audit_before_gin ON audit_logs USING gin (before_value);
CREATE INDEX idx_audit_after_gin  ON audit_logs USING gin (after_value);
