-- ============================================================================
-- FraudGuard Database Migration: V6__otp_challenges.sql
-- Engine: MySQL 8.0+
-- 3D Secure (3DS) OTP Step-Up Challenges for Suspicious Transactions
-- ============================================================================

CREATE TABLE otp_challenges (
  id              CHAR(36) NOT NULL,
  transaction_id  CHAR(36) NOT NULL UNIQUE,
  user_id         CHAR(36) NOT NULL,
  otp_hash        VARCHAR(255) NOT NULL,
  expires_at      DATETIME(6) NOT NULL,
  attempts        INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 3,
  status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  verified_at     DATETIME(6),
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT chk_otp_status CHECK (status IN ('PENDING','VERIFIED','EXPIRED','EXHAUSTED')),
  CONSTRAINT fk_otp_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_otp_transaction ON otp_challenges(transaction_id);
CREATE INDEX idx_otp_user        ON otp_challenges(user_id);
CREATE INDEX idx_otp_status      ON otp_challenges(status);
CREATE INDEX idx_otp_expires     ON otp_challenges(expires_at);

-- Add otp_required flag to transactions
-- MySQL uses MODIFY COLUMN instead of ADD COLUMN IF NOT EXISTS (MySQL 8.0 supports IF NOT EXISTS in some builds)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS otp_required    TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_status      VARCHAR(30);

-- Add CHECK constraint for otp_status separately (MySQL 8.0.16+)
ALTER TABLE transactions
  ADD CONSTRAINT chk_txn_otp_status
    CHECK (otp_status IN ('AWAITING_OTP','OTP_VERIFIED','OTP_FAILED','OTP_EXPIRED'));
