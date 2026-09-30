// com.fraudguard.service.EnrichmentService
package com.fraudguard.service;

import com.fraudguard.cache.RedisVelocityService;
import com.fraudguard.client.IpApiClient;
import com.fraudguard.client.IpApiClient.IpApiResponse;
import com.fraudguard.client.IpQualityScoreClient;
import com.fraudguard.client.IpQualityScoreClient.IpqsResponse;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.dto.request.CheckoutRequest;
import com.fraudguard.engine.model.EnrichedTransactionContext;
import com.fraudguard.entity.User;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Orchestrator service enriching inbound checkout transactions with parallel network intelligence,
 * hardware device telemetry, historical database statistics, and Redis velocity counters.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnrichmentService {

    private static final String SIMULATED_TOR_IP = "185.220.101.45";

    private final IpApiClient ipApiClient;
    private final IpQualityScoreClient ipQualityScoreClient;
    private final DeviceFingerprintService deviceFingerprintService;
    private final TransactionRepository transactionRepository;
    private final RedisVelocityService redisVelocityService;
    private final UserRepository userRepository;

    /**
     * Enriches a transaction request with network, device, historical, and velocity signals.
     *
     * @param request inbound checkout payload
     * @param user authenticated customer entity
     * @param rawIpAddress originating client IP address
     * @return fully populated EnrichedTransactionContext
     */
    public EnrichedTransactionContext enrich(CheckoutRequest request, User user, String rawIpAddress) {
        Objects.requireNonNull(request, "CheckoutRequest cannot be null");
        Objects.requireNonNull(user, "User principal cannot be null");

        // 1. Resolve effective IP (applying sandbox QA overrides)
        String effectiveIp = Boolean.TRUE.equals(request.getSimulateForeignIp())
                ? SIMULATED_TOR_IP
                : (rawIpAddress != null && !rawIpAddress.isBlank() ? rawIpAddress.trim() : "127.0.0.1");

        // 2. Fetch external IP intelligence in parallel with a strict 5-second total timeout
        CompletableFuture<IpApiResponse> ipApiFuture =
                CompletableFuture.supplyAsync(() -> ipApiClient.lookup(effectiveIp));
        CompletableFuture<IpqsResponse> ipqsFuture =
                CompletableFuture.supplyAsync(() -> ipQualityScoreClient.lookup(effectiveIp));

        IpApiResponse ipApi = IpApiResponse.empty();
        IpqsResponse ipqs = IpqsResponse.empty();

        try {
            CompletableFuture.allOf(ipApiFuture, ipqsFuture).get(5, TimeUnit.SECONDS);
            ipApi = ipApiFuture.get();
            ipqs = ipqsFuture.get();
        } catch (TimeoutException timeoutException) {
            log.warn("External IP intelligence enrichment timed out after 5s for IP: {}. Proceeding with partial data.", effectiveIp);
        } catch (Exception exception) {
            log.warn("Error during parallel IP intelligence enrichment for IP {}: {}. Proceeding with fallback.", effectiveIp, exception.getMessage());
        }

        // 3. Consolidate network & proxy signals
        boolean isVpn = ipApi.proxy() || ipqs.vpn() || ipqs.activeVpn() || Boolean.TRUE.equals(request.getSimulateVpn());
        boolean isTor = ipqs.tor() || ipqs.activeTor() || SIMULATED_TOR_IP.equals(effectiveIp);
        boolean isProxy = ipApi.proxy() || ipqs.proxy();
        boolean isHostingIp = ipApi.hosting();
        int ipqsFraudScore = ipqs.fraudScore();

        String ipCountry = (ipApi.countryCode() != null && !ipApi.countryCode().isBlank())
                ? ipApi.countryCode()
                : ipqs.countryCode();
        String ipCity = ipApi.city();
        String ipIsp = (ipApi.isp() != null && !ipApi.isp().isBlank())
                ? ipApi.isp()
                : ipqs.isp();

        String ipTimezone = ipApi.timezone();
        boolean timezoneMismatch = Boolean.TRUE.equals(request.getSimulateForeignIp())
                || !areTimezonesCompatible(request.getBrowserTimezone(), ipTimezone);

        // Calibrate demo user registered home country to active testing location if not simulating foreign IP
        String effectiveHomeCountry = user.getHomeCountry();
        if (!Boolean.TRUE.equals(request.getSimulateForeignIp()) && ipCountry != null && !ipCountry.isBlank()) {
            if ("customer@fraudguard.io".equalsIgnoreCase(user.getEmail())) {
                effectiveHomeCountry = ipCountry;
                if (!ipCountry.equalsIgnoreCase(user.getHomeCountry())) {
                    user.setHomeCountry(ipCountry);
                    try {
                        userRepository.save(user);
                        log.info("Calibrated demo customer [{}] home country to [{}] based on active network origin",
                                user.getEmail(), ipCountry);
                    } catch (Exception ex) {
                        log.warn("Could not persist calibrated demo home country: {}", ex.getMessage());
                    }
                }
            }
        }

        // 4. Device Fingerprint Resolution & History Check
        String effectiveFingerprint = Boolean.TRUE.equals(request.getSimulateNewDevice())
                ? UUID.randomUUID().toString()
                : request.getDeviceFingerprint();

        boolean isNewDevice = deviceFingerprintService.isNewDevice(user.getId(), effectiveFingerprint);
        long deviceSharedAcrossAccounts = deviceFingerprintService.countAccountsSharingDevice(effectiveFingerprint);

        // 5. Query Historical Database Telemetry
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime thirtyDaysAgo = now.minusDays(30);
        OffsetDateTime twentyFourHoursAgo = now.minusHours(24);

        long userTxnCountLast30d = 0L;
        BigDecimal userAvgAmountLast30d = BigDecimal.ZERO;
        long failedAttemptsLast24h = 0L;
        long uniqueUsersFromIpLast24h = 1L;

        try {
            userTxnCountLast30d = transactionRepository.countByUserIdAndCreatedAtAfter(user.getId(), thirtyDaysAgo);
            userAvgAmountLast30d = transactionRepository.averageAmountByUserAfter(user.getId(), thirtyDaysAgo);
            failedAttemptsLast24h = transactionRepository.countByUserIdAndStatusAndCreatedAtAfter(
                    user.getId(), AppConstants.TransactionStatus.BLOCKED, twentyFourHoursAgo);

            if (!isPrivateOrLoopbackIp(effectiveIp)) {
                uniqueUsersFromIpLast24h = transactionRepository.countDistinctUsersByIpAfter(effectiveIp, twentyFourHoursAgo);
            }
        } catch (Exception exception) {
            log.warn("Failed to query historical transaction metrics for user {}: {}", user.getId(), exception.getMessage());
        }

        // 6. Sliding-Window Velocity Counters from Redis
        long userVelocityCount = redisVelocityService.incrementAndGetUserVelocity(user.getId(), null);
        long ipVelocityCount = redisVelocityService.incrementAndGetIpVelocity(effectiveIp, null);

        // 7. Calculate account age in days
        long userAccountAgeDays = user.getCreatedAt() != null
                ? Duration.between(user.getCreatedAt(), now).toDays()
                : 0L;

        log.info("Enrichment complete for user={} ip={} vpn={} tor={} ipqs={}",
                user.getId(), effectiveIp, isVpn, isTor, ipqsFraudScore);

        // 8. Assemble canonical enriched context
        return EnrichedTransactionContext.builder()
                // Checkout Request Telemetry
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .deviceFingerprint(effectiveFingerprint)
                .deviceType(request.getDeviceType())
                .browser(request.getBrowser())
                .os(request.getOs())
                .screenResolution(request.getScreenResolution())
                .timeOnPageMs(request.getTimeOnPageMs())
                .pasteDetected(request.getPasteDetected())
                .timezoneOffsetMinutes(request.getTimezoneOffsetMinutes())
                .browserTimezone(request.getBrowserTimezone())
                .mouseMovementCount(request.getMouseMovementCount())
                .keystrokeVariance(request.getKeystrokeVariance())
                .isHeadless(request.getIsHeadless())
                // Sandbox flags
                .simulateForeignIp(request.getSimulateForeignIp())
                .simulateVpn(request.getSimulateVpn())
                .simulateNewDevice(request.getSimulateNewDevice())
                // Network Intelligence
                .resolvedIpAddress(effectiveIp)
                .ipCountry(ipCountry)
                .ipCity(ipCity)
                .ipIsp(ipIsp)
                .isVpn(isVpn)
                .isTor(isTor)
                .isProxy(isProxy)
                .isHostingIp(isHostingIp)
                .ipqsFraudScore(ipqsFraudScore)
                .timezoneMismatch(timezoneMismatch)
                .ipTimezone(ipTimezone)
                // Device Intelligence
                .isNewDevice(isNewDevice)
                .deviceSharedAcrossAccounts(deviceSharedAcrossAccounts)
                // Customer History
                .userAccountAgeDays(userAccountAgeDays)
                .userTxnCountLast30d(userTxnCountLast30d)
                .userAvgAmountLast30d(userAvgAmountLast30d != null ? userAvgAmountLast30d : BigDecimal.ZERO)
                .failedAttemptsLast24h(failedAttemptsLast24h)
                .uniqueUsersFromIpLast24h(uniqueUsersFromIpLast24h)
                // Redis Velocity
                .userVelocityCount(userVelocityCount)
                .ipVelocityCount(ipVelocityCount)
                // User Principal Info
                .userId(user.getId())
                .userEmail(user.getEmail())
                .userHomeCountry(effectiveHomeCountry)
                .userCreatedAt(user.getCreatedAt())
                .build();
    }

    /**
     * Verifies if browser and network timezones represent the same geographic time window or offset.
     */
    private boolean areTimezonesCompatible(String browserTz, String ipTz) {
        if (browserTz == null || ipTz == null || browserTz.isBlank() || ipTz.isBlank()) {
            return true;
        }
        if (browserTz.equalsIgnoreCase(ipTz)) {
            return true;
        }
        try {
            ZoneId bZone = ZoneId.of(browserTz.trim());
            ZoneId iZone = ZoneId.of(ipTz.trim());
            Instant now = Instant.now();
            return bZone.getRules().getOffset(now).equals(iZone.getRules().getOffset(now));
        } catch (Exception e) {
            // Fail open on timezone string parsing/alias discrepancies (e.g. Asia/Kolkata vs Asia/Calcutta)
            return true;
        }
    }

    /**
     * Determines whether an IP address is a private, loopback, or local network endpoint.
     */
    private boolean isPrivateOrLoopbackIp(String ip) {
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)
                || "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            return true;
        }
        return ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.");
    }
}
