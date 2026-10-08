-- ============================================================================
-- FraudGuard Database Migration: V2__triggers.sql
-- Engine: MySQL 8.0+
-- Description: Business integrity and compliance enforcement triggers.
--              Enforces append-only immutable audit trails, analyst role
--              verification for reviewed transactions, and automatic timestamp
--              refreshes for fraud rule modifications.
-- NOTE: MySQL does not support BEFORE DELETE row-level triggers that raise
--       application-visible exceptions the same way PL/pgSQL does. The
--       append-only enforcement is implemented via BEFORE UPDATE and BEFORE
--       DELETE triggers that call SIGNAL SQLSTATE to abort the operation.
-- ============================================================================

DELIMITER $$

-- ============================================================================
-- TRIGGER 1a: trg_audit_append_only_update
-- Business Rule Enforced:
-- Regulatory compliance (SOC2, PCI-DSS, AML/BSA) mandates that audit logs must be
-- strictly immutable and tamper-evident. Once written, no row in audit_logs may
-- be updated by any user or application process.
-- ============================================================================
CREATE TRIGGER trg_audit_append_only_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_logs is append-only: UPDATE is not permitted on this table';
END$$

-- ============================================================================
-- TRIGGER 1b: trg_audit_append_only_delete
-- Business Rule Enforced:
-- Regulatory compliance mandates no deletion of audit log rows.
-- ============================================================================
CREATE TRIGGER trg_audit_append_only_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_logs is append-only: DELETE is not permitted on this table';
END$$

-- ============================================================================
-- TRIGGER 2a: trg_enforce_analyst_reviewer_insert
-- Business Rule Enforced:
-- Only certified compliance analysts (users with ROLE_ANALYST) are authorized
-- to resolve or approve transactions in the manual review queue. Customers
-- (ROLE_CUSTOMER) or unauthorized identities must never be assigned as reviewers.
-- ============================================================================
CREATE TRIGGER trg_enforce_analyst_reviewer_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_reviewer_role VARCHAR(30);
    IF NEW.reviewed_by IS NOT NULL THEN
        SELECT role INTO v_reviewer_role
        FROM users
        WHERE id = NEW.reviewed_by;

        IF v_reviewer_role IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Reviewer does not exist in users table';
        ELSEIF v_reviewer_role != 'ROLE_ANALYST' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Invalid transaction review: only ROLE_ANALYST is permitted to review transactions';
        END IF;
    END IF;
END$$

-- ============================================================================
-- TRIGGER 2b: trg_enforce_analyst_reviewer_update
-- Business Rule Enforced:
-- Same analyst-role enforcement applied on UPDATE operations.
-- ============================================================================
CREATE TRIGGER trg_enforce_analyst_reviewer_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_reviewer_role VARCHAR(30);
    IF NEW.reviewed_by IS NOT NULL THEN
        SELECT role INTO v_reviewer_role
        FROM users
        WHERE id = NEW.reviewed_by;

        IF v_reviewer_role IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Reviewer does not exist in users table';
        ELSEIF v_reviewer_role != 'ROLE_ANALYST' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Invalid transaction review: only ROLE_ANALYST is permitted to review transactions';
        END IF;
    END IF;
END$$

-- ============================================================================
-- TRIGGER 3: trg_fraud_rules_updated_at
-- Business Rule Enforced:
-- Fraud detection configurations, weights, and thresholds change dynamically.
-- updated_at must be automatically synchronized to NOW() upon any row update.
-- ============================================================================
CREATE TRIGGER trg_fraud_rules_updated_at
BEFORE UPDATE ON fraud_rules
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW(6);
END$$

DELIMITER ;
