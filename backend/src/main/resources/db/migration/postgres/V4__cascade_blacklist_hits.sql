-- ==============================================================================
-- FraudGuard Database Migration V4: Cascade Blacklist Hit Deletions
-- Enables seamless blacklist entity removal without foreign key integrity lock
-- ==============================================================================

ALTER TABLE transaction_blacklist_hits
    DROP CONSTRAINT IF EXISTS transaction_blacklist_hits_blacklist_id_fkey,
    ADD CONSTRAINT transaction_blacklist_hits_blacklist_id_fkey
        FOREIGN KEY (blacklist_id) REFERENCES blacklists(id) ON DELETE CASCADE;
