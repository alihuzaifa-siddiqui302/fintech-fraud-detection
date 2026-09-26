// com.fraudguard.repository.BlacklistRepository
package com.fraudguard.repository;

import com.fraudguard.entity.Blacklist;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for negative-match blacklist entries.
 */
@Repository
public interface BlacklistRepository extends JpaRepository<Blacklist, Long> {

    /**
     * Rapidly verifies whether an entity is blacklisted by type and target value.
     *
     * @param targetType classification (IP, DEVICE, EMAIL, FINGERPRINT)
     * @param targetValue identifier string evaluated against blacklist
     * @return true if matching blacklist entry exists
     */
    boolean existsByTargetTypeAndTargetValue(String targetType, String targetValue);

    /**
     * Retrieves specific blacklist entry by target type and value.
     *
     * @param targetType classification
     * @param targetValue target identifier
     * @return Optional containing matched Blacklist or empty if not present
     */
    Optional<Blacklist> findByTargetTypeAndTargetValue(String targetType, String targetValue);

    /**
     * Lists all blacklisted records ordered chronologically descending for analyst management.
     *
     * @return List of Blacklists ordered by newest first
     */
    List<Blacklist> findAllByOrderByCreatedAtDesc();

    /**
     * Filters blacklist entries by entity type.
     *
     * @param targetType entity type to filter by
     * @return List of matching Blacklists
     */
    List<Blacklist> findByTargetType(String targetType);

    /**
     * Filters blacklist entries by entity type ordered by newest first.
     *
     * @param targetType entity type to filter by
     * @return List of matching Blacklists ordered chronologically descending
     */
    List<Blacklist> findByTargetTypeOrderByCreatedAtDesc(String targetType);
}
