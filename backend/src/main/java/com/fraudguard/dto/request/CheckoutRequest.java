// com.fraudguard.dto.request.CheckoutRequest
package com.fraudguard.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payment checkout submission payload with financial amounts, telemetry, and sandbox test flags.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutRequest {

    @NotNull(message = "Transaction amount is required")
    @Positive(message = "Transaction amount must be strictly greater than zero")
    private BigDecimal amount;

    @NotBlank(message = "Currency code is required")
    @Size(min = 3, max = 3, message = "Currency must be a 3-character ISO-4217 code")
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

    // -------------------------------------------------------------------------
    // Sandbox / QA Testing Emulation Flags
    // -------------------------------------------------------------------------
    
    /**
     * Emulates submission originating from a foreign/Tor IP address (e.g. 185.220.101.45).
     */
    private Boolean simulateForeignIp;

    /**
     * Injects VPN flag indicators into transaction evaluation context.
     */
    private Boolean simulateVpn;

    /**
     * Injects a randomized, brand-new device fingerprint to trigger first-seen heuristics.
     */
    private Boolean simulateNewDevice;
}
