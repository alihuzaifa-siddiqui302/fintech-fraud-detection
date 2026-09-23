// com.fraudguard.repository.IpIntelligenceRepository
package com.fraudguard.repository;

import com.fraudguard.entity.IpIntelligence;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for cached IP reputation and geolocation intelligence.
 */
@Repository
public interface IpIntelligenceRepository extends JpaRepository<IpIntelligence, String> {

    /**
     * Retrieves fresh cached IP intelligence if recorded after the TTL threshold timestamp.
     *
     * @param ipAddress IP address evaluated
     * @param after cache expiration cutoff timestamp
     * @return Optional containing valid cached IpIntelligence or empty if expired/absent
     */
    Optional<IpIntelligence> findByIpAddressAndFetchedAtAfter(String ipAddress, OffsetDateTime after);
}
