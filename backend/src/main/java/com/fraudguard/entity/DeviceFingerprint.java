// com.fraudguard.entity.DeviceFingerprint
package com.fraudguard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Tracks historical device fingerprints associated with user accounts to identify multi-accounting.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "device_fingerprints",
    uniqueConstraints = @UniqueConstraint(name = "uq_user_fingerprint", columnNames = {"user_id", "fingerprint_hash"})
)
public class DeviceFingerprint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private String userId;

    @Column(name = "fingerprint_hash", nullable = false)
    private String fingerprintHash;

    @CreationTimestamp
    @Column(name = "first_seen", nullable = false, updatable = false)
    private OffsetDateTime firstSeen;

    @UpdateTimestamp
    @Column(name = "last_seen", nullable = false)
    private OffsetDateTime lastSeen;

    @Column(name = "txn_count", nullable = false)
    private Integer txnCount;
}
