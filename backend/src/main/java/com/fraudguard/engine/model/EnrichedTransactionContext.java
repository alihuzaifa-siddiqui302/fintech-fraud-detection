// com.fraudguard.engine.model.EnrichedTransactionContext
package com.fraudguard.engine.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Enriched canonical context holding transactional, behavioral, network, and customer history signals for risk evaluation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedTransactionContext {

    // -------------------------------------------------------------------------
    // Core Transaction Data (from CheckoutRequest)
    // -------------------------------------------------------------------------
    private BigDecimal amount;
    private String currency;
    private String deviceFingerprint;
    private String deviceType;
    private String browser;
    private String os;
    private Long timeOnPageMs;
    private Boolean pasteDetected;
    private Integer timezoneOffsetMinutes;
    private String browserTimezone;
    private String screenResolution;
    private Integer mouseMovementCount;
    private Double keystrokeVariance;
    private Boolean isHeadless;

    // Sandbox Emulation Flags
    private Boolean simulateForeignIp;
    private Boolean simulateVpn;
    private Boolean simulateNewDevice;

    // -------------------------------------------------------------------------
    // Network Intelligence & Geolocation Signals
    // -------------------------------------------------------------------------
    private String resolvedIpAddress;
    private String ipCountry;
    private String ipCity;
    private String ipIsp;
    private boolean isVpn;
    private boolean isTor;
    private boolean isProxy;
    private boolean isHostingIp;
    private int ipqsFraudScore;

    // -------------------------------------------------------------------------
    // Device & Fingerprint Intelligence Signals
    // -------------------------------------------------------------------------
    private boolean isNewDevice;
    private long deviceSharedAcrossAccounts;

    // -------------------------------------------------------------------------
    // Historical Customer Behavioral Metrics
    // -------------------------------------------------------------------------
    private long userAccountAgeDays;
    private long userTxnCountLast30d;
    private BigDecimal userAvgAmountLast30d;
    private long failedAttemptsLast24h;
    private long uniqueUsersFromIpLast24h;

    // -------------------------------------------------------------------------
    // Real-Time Sliding-Window Velocity Counters (Redis)
    // -------------------------------------------------------------------------
    private long userVelocityCount;
    private long ipVelocityCount;

    // -------------------------------------------------------------------------
    // Customer Profile Metadata
    // -------------------------------------------------------------------------
    private String userId;
    private String userEmail;
    private String userHomeCountry;
    private OffsetDateTime userCreatedAt;
}
