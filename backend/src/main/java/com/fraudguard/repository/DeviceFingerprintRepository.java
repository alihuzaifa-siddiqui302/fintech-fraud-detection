// com.fraudguard.repository.DeviceFingerprintRepository
package com.fraudguard.repository;

import com.fraudguard.entity.DeviceFingerprint;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for hardware fingerprint bindings and fraud ring detection.
 */
@Repository
public interface DeviceFingerprintRepository extends JpaRepository<DeviceFingerprint, Long> {

    /**
     * Looks up an existing device fingerprint binding for a specific user account.
     *
     * @param userId customer identifier
     * @param fingerprintHash computed device hash
     * @return Optional containing matched DeviceFingerprint or empty if new device
     */
    Optional<DeviceFingerprint> findByUserIdAndFingerprintHash(String userId, String fingerprintHash);

    /**
     * Counts the total number of distinct customer accounts that have transacted from the same device fingerprint.
     *
     * @param hash unique client device fingerprint hash
     * @return distinct count of user accounts linked to this device
     */
    @Query("SELECT COUNT(DISTINCT df.userId) FROM DeviceFingerprint df WHERE df.fingerprintHash = :hash")
    long countDistinctUsersByFingerprintHash(@Param("hash") String hash);
}
