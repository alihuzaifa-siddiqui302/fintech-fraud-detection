// com.fraudguard.service.DeviceFingerprintService
package com.fraudguard.service;

import com.fraudguard.entity.DeviceFingerprint;
import com.fraudguard.repository.DeviceFingerprintRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing client device fingerprint history, first-seen heuristics, and cross-account ring detection.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceFingerprintService {

    private final DeviceFingerprintRepository deviceFingerprintRepository;

    /**
     * Checks if a device fingerprint is new for the user, inserting a record or updating its seen count.
     *
     * @param userId customer identifier
     * @param fingerprintHash client device fingerprint hash
     * @return true if device has never been seen before for this account, false otherwise
     */
    @Transactional
    public boolean isNewDevice(String userId, String fingerprintHash) {
        if (fingerprintHash == null || fingerprintHash.isBlank() || userId == null || userId.isBlank()) {
            return false;
        }

        String sanitizedHash = fingerprintHash.trim();
        Optional<DeviceFingerprint> existingOpt =
                deviceFingerprintRepository.findByUserIdAndFingerprintHash(userId, sanitizedHash);

        if (existingOpt.isEmpty()) {
            DeviceFingerprint newBinding = DeviceFingerprint.builder()
                    .userId(userId)
                    .fingerprintHash(sanitizedHash)
                    .txnCount(1)
                    .firstSeen(OffsetDateTime.now())
                    .lastSeen(OffsetDateTime.now())
                    .build();
            deviceFingerprintRepository.save(newBinding);
            log.info("New device fingerprint detected for user {}: {}", userId, sanitizedHash);
            return true;
        }

        DeviceFingerprint existing = existingOpt.get();
        existing.setTxnCount(existing.getTxnCount() + 1);
        existing.setLastSeen(OffsetDateTime.now());
        deviceFingerprintRepository.save(existing);
        log.debug("Recognized device fingerprint for user {} (txnCount={})", userId, existing.getTxnCount());
        return false;
    }

    /**
     * Counts how many distinct user accounts have submitted transactions through this exact hardware fingerprint.
     *
     * @param fingerprintHash client device fingerprint hash
     * @return distinct count of user accounts linked to this device
     */
    @Transactional(readOnly = true)
    public long countAccountsSharingDevice(String fingerprintHash) {
        if (fingerprintHash == null || fingerprintHash.isBlank()) {
            return 1L;
        }
        return deviceFingerprintRepository.countDistinctUsersByFingerprintHash(fingerprintHash.trim());
    }
}
