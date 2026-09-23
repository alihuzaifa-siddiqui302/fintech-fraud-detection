// com.fraudguard.entity.SessionSignal
package com.fraudguard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Stores granular client-side behavioral telemetry captured during checkout submission.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "session_signals")
public class SessionSignal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", columnDefinition = "uuid", nullable = false, unique = true)
    private String transactionId;

    @Column(name = "time_on_page_ms")
    private Long timeOnPageMs;

    @Column(name = "mouse_movement_count")
    private Integer mouseMovementCount;

    @Column(name = "keystroke_variance", precision = 10, scale = 4)
    private BigDecimal keystrokeVariance;

    @Column(name = "paste_detected")
    private Boolean pasteDetected;

    @Column(name = "is_headless_browser")
    private Boolean isHeadlessBrowser;

    @Column(name = "browser_timezone", length = 100)
    private String browserTimezone;

    @Column(name = "ip_timezone", length = 100)
    private String ipTimezone;

    @Column(name = "screen_resolution", length = 30)
    private String screenResolution;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
