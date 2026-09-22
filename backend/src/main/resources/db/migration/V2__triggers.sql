-- ============================================================================
-- FraudGuard Database Migration: V2__triggers.sql
-- Engine: PostgreSQL 16+
-- Description: Business integrity and compliance enforcement triggers.
--              Enforces append-only immutable audit trails, analyst role
--              verification for reviewed transactions, and automatic timestamp
--              refreshes for fraud rule modifications.
-- ============================================================================

-- ============================================================================
-- TRIGGER 1: trg_audit_append_only
-- Business Rule Enforced:
-- Regulatory compliance (SOC2, PCI-DSS, AML/BSA) mandates that audit logs must be
-- strictly immutable and tamper-evident. Once written, no row in audit_logs may
-- be updated, altered, or deleted by any user or application process.
-- Any mutation attempt is intercepted and rejected at the database engine level.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_audit_logs_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: mutation attempted on row id=%', OLD.id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION fn_audit_logs_append_only();

-- ============================================================================
-- TRIGGER 2: trg_enforce_analyst_reviewer
-- Business Rule Enforced:
-- Only certified compliance analysts (users with ROLE_ANALYST) are authorized
-- to resolve or approve transactions in the manual review queue. Customers
-- (ROLE_CUSTOMER) or unauthorized identities must never be assigned as reviewers.
-- This trigger validates the reviewer's role at the relational boundary to prevent
-- privilege escalation or data tampering even if application logic is bypassed.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_enforce_analyst_reviewer()
RETURNS TRIGGER AS $$
DECLARE
    v_reviewer_role VARCHAR(30);
BEGIN
    IF NEW.reviewed_by IS NOT NULL THEN
        SELECT role INTO v_reviewer_role
        FROM users
        WHERE id = NEW.reviewed_by;

        IF v_reviewer_role IS NULL THEN
            RAISE EXCEPTION 'Reviewer with id=% does not exist in users table', NEW.reviewed_by;
        ELSIF v_reviewer_role != 'ROLE_ANALYST' THEN
            RAISE EXCEPTION 'Invalid transaction review: user id=% has role %, but only ROLE_ANALYST is permitted to review transactions',
                NEW.reviewed_by, v_reviewer_role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_analyst_reviewer
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_analyst_reviewer();

-- ============================================================================
-- TRIGGER 3: trg_fraud_rules_updated_at
-- Business Rule Enforced:
-- Fraud detection configurations, weights, and thresholds change dynamically.
-- To ensure cache invalidation accuracy and auditing precision across distributed
-- services, updated_at must be automatically synchronized to NOW() upon any row update.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_fraud_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fraud_rules_updated_at
BEFORE UPDATE ON fraud_rules
FOR EACH ROW
EXECUTE FUNCTION fn_fraud_rules_updated_at();
