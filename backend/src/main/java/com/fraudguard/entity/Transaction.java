// com.fraudguard.entity.Transaction
package com.fraudguard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

/**
 * Represents a financial transaction evaluated by the fraud detection pipeline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private String id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private String userId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress;

    @Column(name = "ip_country", length = 2)
    private String ipCountry;

    @Column(name = "ip_city", length = 100)
    private String ipCity;

    @Column(name = "ip_isp")
    private String ipIsp;

    @Column(name = "device_fingerprint")
    private String deviceFingerprint;

    @Column(name = "device_type", length = 100)
    private String deviceType;

    @Column(length = 100)
    private String browser;

    @Column(length = 100)
    private String os;

    @Column(name = "screen_resolution", length = 30)
    private String screenResolution;

    @Column(name = "time_on_page_ms")
    private Long timeOnPageMs;

    @Column(name = "paste_detected")
    private Boolean pasteDetected;

    @Column(name = "timezone_mismatch")
    private Boolean timezoneMismatch;

    @Column(name = "is_headless")
    private Boolean isHeadless;

    @Column(name = "is_vpn")
    private Boolean isVpn;

    @Column(name = "is_tor")
    private Boolean isTor;

    @Column(name = "is_proxy")
    private Boolean isProxy;

    @Column(name = "is_hosting_ip")
    private Boolean isHostingIp;

    @Column(name = "ipqs_fraud_score")
    private Integer ipqsFraudScore;

    @Column(name = "risk_score", nullable = false)
    private Integer riskScore;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "triggered_rules", columnDefinition = "jsonb")
    private String triggeredRules;

    @Column(name = "reviewed_by", columnDefinition = "uuid")
    private String reviewedBy;

    @Column(name = "resolution_notes", columnDefinition = "text")
    private String resolutionNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
