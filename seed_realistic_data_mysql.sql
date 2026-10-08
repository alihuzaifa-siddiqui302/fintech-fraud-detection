-- ============================================================================
-- FraudGuard Real-Time Seed Script (MySQL 8.0+)
-- Cleans all transaction, audit, OTP, and SAR records, and inserts fresh,
-- realistic transactions, syndicate graph linkages, SAR reports, and audit logs.
-- ============================================================================

-- 1. CLEAN EXISTING DATA IN STRICT DEPENDENCY ORDER
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE otp_challenges;
TRUNCATE TABLE sar_reports;
TRUNCATE TABLE session_signals;
TRUNCATE TABLE transaction_rule_hits;
TRUNCATE TABLE transaction_blacklist_hits;
TRUNCATE TABLE transactions;
TRUNCATE TABLE device_fingerprints;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE blacklists;
TRUNCATE TABLE ip_intelligence;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. ENSURE DEMO USERS AND SYNDICATE ACTORS EXIST
INSERT INTO users (id, email, name, password_hash, role, home_country, created_at)
VALUES 
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'customer@fraudguard.io',
        'Alex Carter',
        '$2a$12$PgfqdVpvfi/.S9jj.soYeOv8aBZm0WkRybUpN975xHZGHILyutUWy',
        'ROLE_CUSTOMER',
        'US',
        DATE_SUB(NOW(), INTERVAL 180 DAY)
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'analyst@fraudguard.io',
        'Jordan Blake',
        '$2a$12$cwLHxzFo9Fj1g7VgMK3lBuD0M0mRRxJzsOwrj8qf.4ENsLSpababO',
        'ROLE_ANALYST',
        'US',
        DATE_SUB(NOW(), INTERVAL 365 DAY)
    ),
    (
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        'marcus.vance88@gmail.com',
        'Marcus Vance',
        '$2a$12$PgfqdVpvfi/.S9jj.soYeOv8aBZm0WkRybUpN975xHZGHILyutUWy',
        'ROLE_CUSTOMER',
        'US',
        DATE_SUB(NOW(), INTERVAL 14 DAY)
    ),
    (
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        'elena.rostova.fin@proton.me',
        'Elena Rostova',
        '$2a$12$PgfqdVpvfi/.S9jj.soYeOv8aBZm0WkRybUpN975xHZGHILyutUWy',
        'ROLE_CUSTOMER',
        'RU',
        DATE_SUB(NOW(), INTERVAL 7 DAY)
    ),
    (
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        'techdealz.store@outlook.com',
        'Dmitri Volkov',
        '$2a$12$PgfqdVpvfi/.S9jj.soYeOv8aBZm0WkRybUpN975xHZGHILyutUWy',
        'ROLE_CUSTOMER',
        'RU',
        DATE_SUB(NOW(), INTERVAL 3 DAY)
    )
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    name = VALUES(name),
    password_hash = VALUES(password_hash),
    role = VALUES(role),
    home_country = VALUES(home_country);

-- 3. INSERT KNOWN BLACKLISTED ENTITIES
INSERT INTO blacklists (id, target_type, target_value, reason, added_by, created_at)
VALUES
    (1, 'IP', '45.154.255.89', 'Known automated bulletproof proxy relay involved in BIN testing', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', DATE_SUB(NOW(), INTERVAL 5 DAY)),
    (2, 'DEVICE', 'a6029fd3d6420c28e90a', 'Confirmed syndicate master device shared across multiple compromised customer accounts', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- 4. INSERT IP INTELLIGENCE CACHE
INSERT INTO ip_intelligence (ip_address, country_code, country_name, city, isp, org, is_vpn, is_tor, is_proxy, is_hosting_ip, ipqs_fraud_score, raw_response, fetched_at)
VALUES
    ('72.229.28.185', 'US', 'United States', 'New York', 'Spectrum Residential', 'Charter Communications', FALSE, FALSE, FALSE, FALSE, 2, '{"status":"success"}', NOW()),
    ('108.35.44.12', 'US', 'United States', 'New York', 'Verizon Fios', 'Verizon Online LLC', FALSE, FALSE, FALSE, FALSE, 0, '{"status":"success"}', NOW()),
    ('185.220.101.5', 'RU', 'Russia', 'Moscow', 'M247 Ltd Hosting', 'Tor Exit Node Relay', TRUE, TRUE, TRUE, TRUE, 96, '{"status":"success","is_tor":true}', NOW()),
    ('194.26.29.112', 'RU', 'Russia', 'Saint Petersburg', 'NordVPN Datacenter', 'VPN Provider', TRUE, FALSE, TRUE, TRUE, 88, '{"status":"success","is_vpn":true}', NOW()),
    ('45.154.255.89', 'NL', 'Netherlands', 'Amsterdam', 'Bulletproof Hosting B.V.', 'Proxy Network', TRUE, FALSE, TRUE, TRUE, 99, '{"status":"success","is_proxy":true}', NOW()),
    ('12.180.95.4', 'US', 'United States', 'Chicago', 'AT&T Commercial', 'AT&T Services', FALSE, FALSE, FALSE, FALSE, 5, '{"status":"success"}', NOW());

-- 5. INSERT DEVICE FINGERPRINTS BINDINGS
INSERT INTO device_fingerprints (user_id, fingerprint_hash, first_seen, last_seen, txn_count)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd83f4b1a772c9e1028ba', DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_SUB(NOW(), INTERVAL 15 MINUTE), 24),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'm51b9e2401f89c4412ad', DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 2 HOUR), 15),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a6029fd3d6420c28e90a', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 40 MINUTE), 5),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a6029fd3d6420c28e90a', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 35 MINUTE), 4),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'a6029fd3d6420c28e90a', DATE_SUB(NOW(), INTERVAL 18 HOUR), DATE_SUB(NOW(), INTERVAL 20 MINUTE), 6);

-- 6. INSERT REALISTIC TRANSACTIONS
INSERT INTO transactions (
    id, user_id, amount, currency, ip_address, ip_country, ip_city, ip_isp,
    device_fingerprint, device_type, browser, os, screen_resolution, time_on_page_ms,
    paste_detected, timezone_mismatch, is_headless, is_vpn, is_tor, is_proxy, is_hosting_ip,
    ipqs_fraud_score, risk_score, status, triggered_rules, reviewed_by, resolution_notes,
    otp_required, otp_status, created_at
) VALUES
-- Txn 1: Coffee & Bakery (15m ago, Clean)
(
    '11111111-1111-4111-a111-111111111111',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    14.80, 'USD', '72.229.28.185', 'US', 'New York', 'Spectrum Residential',
    'd83f4b1a772c9e1028ba', 'Desktop', 'Chrome 124', 'macOS', '1920x1080', 12400,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    0, 0, 'APPROVED', '[]', NULL, NULL,
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 15 MINUTE)
),
-- Txn 2: Apple App Store (2h ago, Clean)
(
    '22222222-2222-4222-a222-222222222222',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    45.20, 'USD', '72.229.28.185', 'US', 'New York', 'Spectrum Residential',
    'd83f4b1a772c9e1028ba', 'Desktop', 'Chrome 124', 'macOS', '1920x1080', 8900,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    0, 0, 'APPROVED', '[]', NULL, NULL,
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR)
),
-- Txn 3: Amazon Marketplace (5h ago, Clean)
(
    '33333333-3333-4333-a333-333333333333',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    129.50, 'USD', '108.35.44.12', 'US', 'New York', 'Verizon Fios',
    'm51b9e2401f89c4412ad', 'Mobile', 'Mobile Safari', 'iOS', '390x844', 15400,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    2, 0, 'APPROVED', '[]', NULL, NULL,
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 5 HOUR)
),
-- Txn 4: Delta Airlines Flight (1d ago, Minor Round Amount)
(
    '44444444-4444-4444-a444-444444444444',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    310.00, 'USD', '72.229.28.185', 'US', 'New York', 'Spectrum Residential',
    'd83f4b1a772c9e1028ba', 'Desktop', 'Chrome 124', 'macOS', '1920x1080', 32000,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    0, 10, 'APPROVED', '[{"ruleCode":"ROUND_AMOUNT","ruleName":"Round Transaction Amount","weight":10,"reason":"Transaction amount is a precise multiple of 10"}]', NULL, NULL,
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)
),
-- Txn 5: BestBuy Electronics (3h ago, 3DS Step-Up Verified)
(
    '55555555-5555-4555-a555-555555555555',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    480.00, 'USD', '12.180.95.4', 'US', 'Chicago', 'AT&T Commercial',
    'new_device_fp_7721ba', 'Laptop', 'Edge 122', 'Windows 11', '1920x1080', 9200,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    5, 35, 'APPROVED', '[{"ruleCode":"NEW_DEVICE","ruleName":"New Device First Seen","weight":15,"reason":"Device fingerprint never observed for customer"},{"ruleCode":"ROUND_AMOUNT","ruleName":"Round Amount","weight":10,"reason":"Round ticket value"},{"ruleCode":"GEO_MISMATCH","ruleName":"Geolocation Variance","weight":10,"reason":"IP Chicago differs from home state New York"}]', NULL, 'Approved automatically following successful 3DS SMS OTP challenge completion',
    TRUE, 'OTP_VERIFIED', DATE_SUB(NOW(), INTERVAL 3 HOUR)
),
-- Txn 6: Luxury Watch Retailer (28m ago, 3DS Step-Up Pending OTP)
(
    '66666666-6666-4666-a666-666666666666',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    920.00, 'USD', '12.180.95.4', 'US', 'Chicago', 'AT&T Commercial',
    'new_device_fp_7721ba', 'Laptop', 'Edge 122', 'Windows 11', '1920x1080', 4100,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    12, 45, 'PENDING_REVIEW', '[{"ruleCode":"NEW_DEVICE","ruleName":"New Device First Seen","weight":15,"reason":"Device fingerprint never observed for customer"},{"ruleCode":"HIGH_AMOUNT","ruleName":"Elevated Financial Amount","weight":20,"reason":"Amount $920 exceeds standard baseline"},{"ruleCode":"ROUND_AMOUNT","ruleName":"Round Amount","weight":10,"reason":"Even multiple of 10"}]', NULL, NULL,
    TRUE, 'AWAITING_OTP', DATE_SUB(NOW(), INTERVAL 28 MINUTE)
),
-- Txn 7: Syndicate Actor 1 - Marcus Vance (Blocked, Tor Exit Node, Shared Device)
(
    '77777777-7777-4777-a777-777777777777',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    3800.00, 'USD', '185.220.101.5', 'RU', 'Moscow', 'M247 Ltd Hosting',
    'a6029fd3d6420c28e90a', 'Desktop', 'Chrome 120 (Automation)', 'Linux', '800x600', 1400,
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
    96, 95, 'BLOCKED', '[{"ruleCode":"HEADLESS_BROWSER","ruleName":"Headless Browser Automation","weight":35,"reason":"navigator.webdriver active"},{"ruleCode":"DEVICE_SHARED_ACCOUNTS","ruleName":"Hardware Fingerprint Shared Across Multiple Accounts","weight":35,"reason":"Device fingerprint shared with 3+ accounts"},{"ruleCode":"IS_TOR","ruleName":"Tor Network Exit Node","weight":30,"reason":"Direct match with active Tor directory"},{"ruleCode":"HOSTING_IP","ruleName":"Datacenter IP","weight":20,"reason":"Traffic routed through commercial hosting datacenter"},{"ruleCode":"TIME_ON_PAGE_TOO_FAST","ruleName":"Bot Interaction Speed","weight":20,"reason":"Checkout completed in 1400ms"}]', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Confirmed syndicate fraud ring member. Hardware device linked to Marcus Vance and Elena Rostova.',
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 45 MINUTE)
),
-- Txn 8: Syndicate Actor 2 - Elena Rostova (Blocked, Same Shared Device, NordVPN)
(
    '88888888-8888-4888-a888-888888888888',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    4200.00, 'USD', '185.220.101.5', 'RU', 'Moscow', 'M247 Ltd Hosting',
    'a6029fd3d6420c28e90a', 'Desktop', 'Chrome 120 (Automation)', 'Linux', '800x600', 1100,
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
    96, 95, 'BLOCKED', '[{"ruleCode":"HEADLESS_BROWSER","ruleName":"Headless Browser Automation","weight":35,"reason":"navigator.webdriver active"},{"ruleCode":"DEVICE_SHARED_ACCOUNTS","ruleName":"Hardware Fingerprint Shared Across Multiple Accounts","weight":35,"reason":"Device fingerprint shared with Marcus Vance"},{"ruleCode":"HIGH_AMOUNT","ruleName":"Elevated Financial Amount","weight":40,"reason":"Ticket exceeds $4,000 threshold"}]', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Adjudicated as organized syndicate card testing ring. FinCEN SAR officially filed.',
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 40 MINUTE)
),
-- Txn 9: Syndicate Actor 3 - Dmitri Volkov (Carding Velocity Burst, Same Shared Device)
(
    '99999999-9999-4999-a999-999999999999',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    2900.00, 'USD', '194.26.29.112', 'RU', 'Saint Petersburg', 'NordVPN Datacenter',
    'a6029fd3d6420c28e90a', 'Desktop', 'Chrome 122', 'Windows 10', '1920x1080', 2100,
    TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, TRUE,
    88, 90, 'BLOCKED', '[{"ruleCode":"DEVICE_SHARED_ACCOUNTS","ruleName":"Hardware Fingerprint Shared Across Multiple Accounts","weight":35,"reason":"Device shared across 3 distinct identities"},{"ruleCode":"IS_VPN","ruleName":"Commercial VPN Anonymizer","weight":25,"reason":"NordVPN exit node detected"},{"ruleCode":"RAPID_VELOCITY","ruleName":"High-Frequency Transaction Velocity","weight":40,"reason":"3 transactions within 60 seconds"},{"ruleCode":"HIGH_AMOUNT","ruleName":"High Amount","weight":40,"reason":"Amount exceeds $2,000"}]', NULL, NULL,
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 25 MINUTE)
),
-- Txn 10: Direct Blacklist Hit (Instant Block)
(
    'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    1450.00, 'USD', '45.154.255.89', 'NL', 'Amsterdam', 'Bulletproof Hosting B.V.',
    'random_spoofed_fp_9981', 'Desktop', 'Firefox 118', 'Linux', '1024x768', 3500,
    FALSE, FALSE, FALSE, TRUE, FALSE, TRUE, TRUE,
    99, 100, 'BLOCKED', '[{"ruleCode":"BLACKLIST_MATCH","ruleName":"Global Blacklist Match","weight":100,"reason":"IP 45.154.255.89 is listed in global fraud blacklist"}]', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Blocked immediately upon ingress due to active blacklist entry',
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 1 HOUR)
),
-- Txn 11: Pending Analyst Review Queue (Borderline International Software Order)
(
    'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    750.00, 'USD', '12.180.95.4', 'US', 'Chicago', 'AT&T Commercial',
    'fp_unverified_device_22', 'Desktop', 'Safari 17', 'macOS', '1440x900', 4800,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    28, 55, 'PENDING_REVIEW', '[{"ruleCode":"NEW_DEVICE","ruleName":"New Device First Seen","weight":15,"reason":"Unrecognized hardware footprint"},{"ruleCode":"HIGH_AMOUNT","ruleName":"High Transaction Value","weight":20,"reason":"$750 exceeds daily average"},{"ruleCode":"GEO_MISMATCH","ruleName":"Geolocation Anomaly","weight":20,"reason":"Originating IP outside profile region"}]', NULL, NULL,
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 35 MINUTE)
),
-- Txn 12: Analyst Adjudicated Approved (Legitimate Overseas Travel Cleared by Jordan Blake)
(
    'cccccccc-cccc-4ccc-cccc-cccccccccccc',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    890.00, 'USD', '12.180.95.4', 'US', 'Chicago', 'AT&T Commercial',
    'd83f4b1a772c9e1028ba', 'Desktop', 'Chrome 124', 'macOS', '1920x1080', 21000,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    5, 25, 'APPROVED', '[{"ruleCode":"GEO_MISMATCH","ruleName":"Out-of-State IP","weight":15,"reason":"Chicago IP vs NY billing address"},{"ruleCode":"ROUND_AMOUNT","ruleName":"Round Amount","weight":10,"reason":"Round tens amount"}]', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Customer contacted support. Confirmed attending fintech conference in Chicago.',
    FALSE, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)
);

-- 7. INSERT TRANSACTION RULE HITS (Detailed Explanations)
INSERT INTO transaction_rule_hits (transaction_id, rule_id, weight_applied, observed_value, trigger_reason)
VALUES
    ('44444444-4444-4444-a444-444444444444', 19, 10, 310.00, 'Transaction amount $310.00 is a multiple of 10'),
    ('55555555-5555-4555-a555-555555555555', 18, 15, 1.00, 'Device fingerprint new_device_fp_7721ba first seen'),
    ('55555555-5555-4555-a555-555555555555', 19, 10, 480.00, 'Transaction amount $480.00 is a multiple of 10'),
    ('55555555-5555-4555-a555-555555555555', 9, 10, 1.00, 'IP Chicago does not match billing home state NY'),
    ('66666666-6666-4666-a666-666666666666', 18, 15, 1.00, 'Device fingerprint first seen'),
    ('66666666-6666-4666-a666-666666666666', 6, 20, 920.00, 'Amount $920 exceeds standard single ticket limit'),
    ('66666666-6666-4666-a666-666666666666', 19, 10, 920.00, 'Even amount multiple of 10'),
    ('77777777-7777-4777-a777-777777777777', 2, 35, 1.00, 'navigator.webdriver detected by client telemetry'),
    ('77777777-7777-4777-a777-777777777777', 3, 35, 3.00, 'Hardware fingerprint a6029fd3d6420c28e90a shared across 3 accounts'),
    ('77777777-7777-4777-a777-777777777777', 4, 30, 1.00, 'IP 185.220.101.5 is an active Tor directory exit node'),
    ('77777777-7777-4777-a777-777777777777', 13, 20, 1.00, 'M247 Ltd Hosting datacenter infrastructure detected'),
    ('88888888-8888-4888-a888-888888888888', 2, 35, 1.00, 'Headless browser execution environment'),
    ('88888888-8888-4888-a888-888888888888', 3, 35, 3.00, 'Hardware fingerprint shared with Marcus Vance and Dmitri Volkov'),
    ('88888888-8888-4888-a888-888888888888', 6, 40, 4200.00, 'Ticket size exceeds $4,000 baseline threshold'),
    ('99999999-9999-4999-a999-999999999999', 3, 35, 3.00, 'Hardware fingerprint a6029fd3d6420c28e90a shared across multiple users'),
    ('99999999-9999-4999-a999-999999999999', 8, 25, 1.00, 'Commercial VPN anonymizer active (NordVPN)'),
    ('99999999-9999-4999-a999-999999999999', 5, 40, 3.00, '3 attempts in 60s velocity burst'),
    ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 1, 100, 1.00, 'IP 45.154.255.89 is blacklisted in global directory'),
    ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 18, 15, 1.00, 'New device fingerprint seen'),
    ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 6, 20, 750.00, 'High financial ticket amount'),
    ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 9, 20, 1.00, 'Originating IP outside expected home geography');

-- 8. INSERT TRANSACTION BLACKLIST HIT RECORD
INSERT INTO transaction_blacklist_hits (transaction_id, blacklist_id)
VALUES ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 1);

-- 9. INSERT SESSION SIGNALS
INSERT INTO session_signals (
    transaction_id, time_on_page_ms, mouse_movement_count, keystroke_variance,
    paste_detected, is_headless_browser, browser_timezone, ip_timezone, screen_resolution, created_at
) VALUES
    ('11111111-1111-4111-a111-111111111111', 12400, 48, 142.5000, FALSE, FALSE, 'America/New_York', 'America/New_York', '1920x1080', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
    ('55555555-5555-4555-a555-555555555555', 9200, 26, 88.2000, FALSE, FALSE, 'America/Chicago', 'America/Chicago', '1920x1080', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
    ('66666666-6666-4666-a666-666666666666', 4100, 12, 65.4000, FALSE, FALSE, 'America/Chicago', 'America/Chicago', '1920x1080', DATE_SUB(NOW(), INTERVAL 28 MINUTE)),
    ('77777777-7777-4777-a777-777777777777', 1400, 0, 0.0000, TRUE, TRUE, 'Europe/Moscow', 'Europe/Moscow', '800x600', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
    ('88888888-8888-4888-a888-888888888888', 1100, 0, 0.0000, TRUE, TRUE, 'Europe/Moscow', 'Europe/Moscow', '800x600', DATE_SUB(NOW(), INTERVAL 40 MINUTE));

-- 10. INSERT 3DS OTP CHALLENGES
INSERT INTO otp_challenges (
    id, transaction_id, user_id, otp_hash, expires_at, attempts, max_attempts, status, verified_at, created_at
) VALUES
    (
        'f1111111-1111-4111-b111-111111111111',
        '55555555-5555-4555-a555-555555555555',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '$2a$10$w0uQJb1L9wD81z4V1Jk57O7g1v5lq5w0q8q4x1y2z3a4b5c6d7e8f',
        DATE_ADD(NOW(), INTERVAL 10 MINUTE),
        1, 3, 'VERIFIED', DATE_SUB(NOW(), INTERVAL 178 MINUTE), DATE_SUB(NOW(), INTERVAL 3 HOUR)
    ),
    (
        'f2222222-2222-4222-b222-222222222222',
        '66666666-6666-4666-a666-666666666666',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '$2a$10$w0uQJb1L9wD81z4V1Jk57O7g1v5lq5w0q8q4x1y2z3a4b5c6d7e8f',
        DATE_ADD(NOW(), INTERVAL 12 MINUTE),
        0, 3, 'PENDING', NULL, DATE_SUB(NOW(), INTERVAL 28 MINUTE)
    );

-- 11. INSERT REALISTIC AI SAR REPORTS
INSERT INTO sar_reports (
    id, transaction_id, generated_by, report_text, model_used,
    prompt_token_count, output_token_count, generation_ms, status, filed_at, filed_by, notes, created_at
) VALUES
-- Report 1: Draft stage (Txn 7 - Marcus Vance)
(
    'e1111111-1111-4111-c111-111111111111',
    '77777777-7777-4777-a777-777777777777',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'SUSPICIOUS ACTIVITY REPORT (SAR) NARRATIVE\nFINCEN FORM 111 COMPLIANCE FILING\n\nPART I — EXECUTIVE SUMMARY:\nOn September 26, 2026, the FraudGuard Automated Risk Assessment Engine flagged and disqualified a high-risk checkout attempt originating from user Marcus Vance (Account ID: c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33) totaling $3,800.00 USD. The transaction evaluated to a composite risk score of 95/100, necessitating an immediate system block and priority compliance review.\n\nPART II — IDENTIFIED RED FLAGS & SUSPICIOUS PATTERNS:\n1. Hardware Fingerprint Multi-Account Cycling: The client device fingerprint (a6029fd3d6420c28e90a) was confirmed to be actively linked with 3 distinct user identities across unrelated financial accounts within a 48-hour window, presenting strong indicators of an organized fraud syndicate.\n2. Anonymizing Tor Relay Evasion: The transaction was routed through an active Tor exit node (185.220.101.5), originating from M247 Ltd datacenter infrastructure in Moscow, Russian Federation.\n3. Bot & Mechanical Automation: Biometric behavioral analysis registered 0ms keystroke variance, mechanical clipboard injection, and navigator.webdriver automation flags, concluding non-human execution.\n\nPART III — CHRONOLOGICAL AUDIT TRAIL:\n- 18:05:12 UTC: Session initiated via Tor exit node 185.220.101.5.\n- 18:05:13 UTC: Automated payment form paste event detected (time on page: 1,400ms).\n- 18:05:14 UTC: Composite risk score evaluated at 95; transaction marked BLOCKED.\n\nPART IV — LAW ENFORCEMENT RECOMMENDATION:\nIt is recommended to maintain the block on Marcus Vance, add the associated device fingerprint to global negative files, and retain forensic payload logs for regulatory compliance.',
    'gemini-2.0-flash',
    782, 345, 1840,
    'DRAFT', NULL, NULL, 'Initial automated AI draft awaiting senior analyst review', DATE_SUB(NOW(), INTERVAL 40 MINUTE)
),
-- Report 2: Filed stage (Txn 8 - Elena Rostova)
(
    'e2222222-2222-4222-c222-222222222222',
    '88888888-8888-4888-a888-888888888888',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'SUSPICIOUS ACTIVITY REPORT (SAR) NARRATIVE\nFINCEN FORM 111 COMPLIANCE FILING — OFFICIAL RECORD\n\nPART I — EXECUTIVE SUMMARY:\nFraudGuard Compliance Adjudication Division has completed investigation of transaction 88888888-8888-4888-a888-888888888888 ($4,200.00 USD) attributed to Elena Rostova. The transaction triggered multiple critical risk rules with a composite score of 95/100 and has been adjudicated as an active syndicate card testing operation.\n\nPART II — FORENSIC CORROBORATION:\n- Shared Device Fingerprint: Corroborated with Marcus Vance (c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33) and Dmitri Volkov (e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55).\n- Network Telemetry: Russian Federation Tor exit node relay (185.220.101.5) with synthetic browser user-agent spoofing.\n- Value Threshold: Rapid financial ticket escalation for non-standard digital vouchers.\n\nPART III — ADJUDICATION & FILING ACTION:\nLead Compliance Analyst Jordan Blake has finalized this document and officially filed it under BSA SAR Regulations. Account has been permanently locked.',
    'gemini-2.0-flash',
    810, 290, 1620,
    'FILED', DATE_SUB(NOW(), INTERVAL 20 MINUTE), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Formally filed with FinCEN compliance registry', DATE_SUB(NOW(), INTERVAL 35 MINUTE)
);

-- 12. INSERT COMPLIANCE AUDIT LOGS
INSERT INTO audit_logs (
    actor_id, actor_email, action, entity_type, entity_id, before_value, after_value, ip_address, notes, created_at
) VALUES
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'analyst@fraudguard.io',
        'RULE_UPDATED',
        'fraud_rules',
        'HEADLESS_BROWSER',
        '{"risk_weight": 30, "is_enabled": true}',
        '{"risk_weight": 35, "is_enabled": true}',
        '108.35.44.12',
        'Calibrated risk weight from 30 to 35 following increase in Puppeteer card testing attacks',
        DATE_SUB(NOW(), INTERVAL 2 DAY)
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'analyst@fraudguard.io',
        'BLACKLIST_ENTRY_ADDED',
        'blacklists',
        '45.154.255.89',
        NULL,
        '{"target_type": "IP", "target_value": "45.154.255.89", "reason": "Known automated proxy relay"}',
        '108.35.44.12',
        'Added proxy IP to global blacklist following threat intelligence bulletin',
        DATE_SUB(NOW(), INTERVAL 1 DAY)
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'analyst@fraudguard.io',
        'TRANSACTION_ADJUDICATED',
        'transactions',
        'cccccccc-cccc-4ccc-cccc-cccccccccccc',
        '{"status": "PENDING_REVIEW"}',
        '{"status": "APPROVED"}',
        '108.35.44.12',
        'Customer contacted support. Confirmed attending fintech conference in Chicago.',
        DATE_SUB(NOW(), INTERVAL 18 HOUR)
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'analyst@fraudguard.io',
        'SAR_GENERATED',
        'sar_reports',
        'e1111111-1111-4111-c111-111111111111',
        NULL,
        '{"model": "gemini-2.0-flash", "outputTokens": 345, "generationMs": 1840}',
        '108.35.44.12',
        'Generated AI SAR narrative for transaction 77777777-7777-4777-a777-777777777777',
        DATE_SUB(NOW(), INTERVAL 40 MINUTE)
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'analyst@fraudguard.io',
        'SAR_STATUS_UPDATED',
        'sar_reports',
        'e2222222-2222-4222-c222-222222222222',
        '{"status": "DRAFT"}',
        '{"status": "FILED"}',
        '108.35.44.12',
        'Approved and submitted FinCEN SAR filing following syndicate linkage verification',
        DATE_SUB(NOW(), INTERVAL 20 MINUTE)
    );
