-- ==============================================================================
-- FraudGuard Database Migration V4: Cascade Blacklist Hit Deletions
-- Engine: MySQL 8.0+
-- Enables seamless blacklist entity removal without foreign key integrity lock.
-- MySQL requires dropping and re-adding the constraint explicitly.
-- ==============================================================================

-- Drop the existing foreign key constraint (MySQL syntax)
ALTER TABLE transaction_blacklist_hits
    DROP FOREIGN KEY fk_tbh_blacklist;

-- Re-add with ON DELETE CASCADE
ALTER TABLE transaction_blacklist_hits
    ADD CONSTRAINT fk_tbh_blacklist
        FOREIGN KEY (blacklist_id) REFERENCES blacklists(id) ON DELETE CASCADE;
