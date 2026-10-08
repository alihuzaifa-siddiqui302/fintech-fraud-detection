-- ==============================================================================
-- FraudGuard Database Migration V4: Cascade Blacklist Hit Deletions (MySQL)
-- Enables seamless blacklist entity removal without foreign key integrity lock
-- ==============================================================================

ALTER TABLE transaction_blacklist_hits
    DROP FOREIGN KEY fk_tbh_blacklist;

ALTER TABLE transaction_blacklist_hits
    ADD CONSTRAINT fk_tbh_blacklist
        FOREIGN KEY (blacklist_id) REFERENCES blacklists(id) ON DELETE CASCADE;
