-- ============================================================================
-- FraudGuard Database Migration: V3__seed_data.sql
-- Engine: PostgreSQL 16+
-- Description: Baseline seed data for development, staging, and demo environments.
--              Includes pre-configured demo users (Customer & Analyst) with verified
--              $2a$12$ BCrypt credentials and the complete initial catalog of
--              all 20 production fraud detection rules.
-- ============================================================================

-- ============================================================================
-- BLOCK 1: Demo Users
-- Fixed UUIDs for predictable testing and seed stability.
-- Password for both accounts: 'demo1234'
-- Hashes: Verified cryptographically using BCrypt with work factor cost 12 ($2a$12$)
-- ============================================================================
INSERT INTO users (id, email, name, password_hash, role, home_country, created_at)
VALUES 
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'customer@fraudguard.io',
        'Alex Carter',
        '$2a$12$PgfqdVpvfi/.S9jj.soYeOv8aBZm0WkRybUpN975xHZGHILyutUWy',
        'ROLE_CUSTOMER',
        'US',
        NOW()
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'analyst@fraudguard.io',
        'Jordan Blake',
        '$2a$12$cwLHxzFo9Fj1g7VgMK3lBuD0M0mRRxJzsOwrj8qf.4ENsLSpababO',
        'ROLE_ANALYST',
        'US',
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BLOCK 2: Fraud Detection Rules Catalog (All 20 Rules)
-- Defines risk weights, threshold values, activation flags, and descriptions.
-- ============================================================================
INSERT INTO fraud_rules (rule_code, name, description, threshold_value, risk_weight, is_enabled)
VALUES
    (
        'BLACKLIST_MATCH',
        'Blacklist Match',
        'Instant block — IP, device, email or fingerprint matches a known blacklist entry. No further evaluation.',
        0.00,
        100,
        TRUE
    ),
    (
        'HEADLESS_BROWSER',
        'Headless Browser Automation Detected',
        'Transaction submitted via an automated headless browser (Puppeteer, Playwright, Selenium detected).',
        0.00,
        35,
        TRUE
    ),
    (
        'DEVICE_SHARED_ACCOUNTS',
        'Device Shared Across Multiple Accounts',
        'Same device fingerprint seen across more than threshold distinct user accounts — fraud ring indicator.',
        2.00,
        35,
        TRUE
    ),
    (
        'IS_TOR',
        'Tor Exit Node Network Detected',
        'Transaction IP is a known Tor exit node. High anonymisation intent.',
        0.00,
        30,
        TRUE
    ),
    (
        'RAPID_VELOCITY',
        'High Velocity Rapid Transactions',
        'More than threshold transactions from this user or IP within a 5-minute sliding window.',
        3.00,
        40,
        TRUE
    ),
    (
        'HIGH_AMOUNT',
        'Elevated Transaction Amount',
        'Transaction amount exceeds threshold USD value. Calibrate per merchant risk appetite.',
        2000.00,
        40,
        TRUE
    ),
    (
        'IPQS_HIGH_SCORE',
        'High Risk IP Intelligence Score',
        'IPQualityScore IP fraud score exceeds threshold on 0-100 scale. Score >= 75 is high risk.',
        75.00,
        30,
        TRUE
    ),
    (
        'IS_VPN',
        'VPN Connection Detected',
        'Transaction IP identified as a VPN endpoint. May indicate location masking.',
        0.00,
        25,
        TRUE
    ),
    (
        'GEO_MISMATCH',
        'IP Country Geolocation Mismatch',
        'IP geolocation country does not match the user''s registered home country.',
        0.00,
        25,
        TRUE
    ),
    (
        'NEW_ACCOUNT_SURGE',
        'New Account High Value Surge',
        'Account less than 48 hours old submitting a transaction above threshold amount.',
        500.00,
        25,
        TRUE
    ),
    (
        'MULTIPLE_USERS_SAME_IP',
        'Multiple Accounts Sharing Same IP',
        'More than threshold distinct accounts have transacted from the same IP within 24 hours.',
        3.00,
        25,
        TRUE
    ),
    (
        'IS_PROXY',
        'Open Proxy Anonymizer Detected',
        'Transaction IP is an identified open proxy.',
        0.00,
        20,
        TRUE
    ),
    (
        'HOSTING_IP',
        'Cloud Datacenter Hosting IP',
        'IP belongs to a cloud datacenter or hosting provider (AWS, GCP, DigitalOcean, etc.).',
        0.00,
        20,
        TRUE
    ),
    (
        'FAILED_ATTEMPTS',
        'Recent Consecutive Failed Transactions',
        'More than threshold blocked transactions from this user or IP in the past 24 hours.',
        2.00,
        20,
        TRUE
    ),
    (
        'RAPID_AMOUNT_ESCALATION',
        'Abnormal Spending Escalation Ratio',
        'Transaction amount exceeds threshold times the user''s 30-day rolling average amount.',
        3.00,
        20,
        TRUE
    ),
    (
        'PASTE_DETECTED',
        'Payment Details Clipboard Paste',
        'Payment field data was clipboard-pasted. Common pattern with stolen card credentials.',
        0.00,
        15,
        TRUE
    ),
    (
        'TIMEZONE_MISMATCH',
        'Client and Network Timezone Discrepancy',
        'Browser-reported timezone differs from the timezone expected for the IP geolocation.',
        0.00,
        15,
        TRUE
    ),
    (
        'NEW_DEVICE',
        'Unrecognized Device Fingerprint',
        'Device fingerprint not previously seen for this user account.',
        0.00,
        15,
        TRUE
    ),
    (
        'ROUND_AMOUNT',
        'Suspicious Round Amount Testing',
        'Suspiciously round amount below threshold. Common automated card-testing pattern.',
        1000.00,
        10,
        TRUE
    ),
    (
        'OFF_HOURS_TXN',
        'High-Risk Off-Hours Activity Window',
        'Transaction submitted 02:00–05:00 UTC. Elevated risk window for automated fraud activity.',
        0.00,
        10,
        TRUE
    )
ON CONFLICT (rule_code) DO NOTHING;
