-- ==============================================================================
-- FraudGuard Database Migration V6: 3DS OTP Step-Up Challenges (MySQL)
-- 3D Secure (3DS) OTP Step-Up Challenges for Suspicious Transactions
-- ==============================================================================

CREATE TABLE otp_challenges (
  id              VARCHAR(36) PRIMARY KEY,
  transaction_id  VARCHAR(36) NOT NULL UNIQUE,
  user_id         VARCHAR(36) NOT NULL,
  otp_hash        VARCHAR(255) NOT NULL,
  expires_at      DATETIME(6) NOT NULL,
  attempts        INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 3,
  status          VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','VERIFIED','EXPIRED','EXHAUSTED')),
  verified_at     DATETIME(6),
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_otp_txn FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_otp_transaction ON otp_challenges(transaction_id);
CREATE INDEX idx_otp_user        ON otp_challenges(user_id);
CREATE INDEX idx_otp_status      ON otp_challenges(status);
CREATE INDEX idx_otp_expires     ON otp_challenges(expires_at);

-- Add otp_required flag to transactions
ALTER TABLE transactions
  ADD COLUMN otp_required    BOOLEAN DEFAULT FALSE,
  ADD COLUMN otp_status      VARCHAR(30)
    CHECK (otp_status IN ('AWAITING_OTP','OTP_VERIFIED','OTP_FAILED','OTP_EXPIRED'));
