-- V6__otp_challenges.sql
-- 3D Secure (3DS) OTP Step-Up Challenges for Suspicious Transactions

CREATE TABLE otp_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL UNIQUE
                  REFERENCES transactions(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL
                  REFERENCES users(id) ON DELETE RESTRICT,
  otp_hash        VARCHAR(255) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  attempts        INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 3,
  status          VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','VERIFIED','EXPIRED','EXHAUSTED')),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_transaction ON otp_challenges(transaction_id);
CREATE INDEX idx_otp_user        ON otp_challenges(user_id);
CREATE INDEX idx_otp_status      ON otp_challenges(status);
CREATE INDEX idx_otp_expires     ON otp_challenges(expires_at);

-- Add otp_required flag to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS otp_required    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS otp_status      VARCHAR(30)
    CHECK (otp_status IN ('AWAITING_OTP','OTP_VERIFIED','OTP_FAILED','OTP_EXPIRED'));
