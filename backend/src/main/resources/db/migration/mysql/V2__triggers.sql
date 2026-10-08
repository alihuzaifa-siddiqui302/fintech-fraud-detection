-- ============================================================================
-- FraudGuard Database Migration: V2__triggers.sql
-- Engine: MySQL 8.0+
-- Description: Business integrity and compliance enforcement triggers.
--              Enforces append-only immutable audit trails and analyst role
--              verification for reviewed transactions.
-- ============================================================================

DELIMITER $$

-- ============================================================================
-- TRIGGER 1: trg_audit_append_only_update & trg_audit_append_only_delete
-- Business Rule Enforced:
-- Regulatory compliance (SOC2, PCI-DSS, AML/BSA) mandates that audit logs must be
-- strictly immutable and tamper-evident. Once written, no row in audit_logs may
-- be updated, altered, or deleted by any user or application process.
-- ============================================================================
CREATE TRIGGER trg_audit_append_only_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs is append-only: mutation attempted';
END$$

CREATE TRIGGER trg_audit_append_only_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs is append-only: deletion attempted';
END$$

-- ============================================================================
-- TRIGGER 2: trg_enforce_analyst_reviewer (INSERT & UPDATE)
-- Business Rule Enforced:
-- Only certified compliance analysts (users with ROLE_ANALYST) are authorized
-- to resolve or approve transactions in the manual review queue.
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

DELIMITER ;
