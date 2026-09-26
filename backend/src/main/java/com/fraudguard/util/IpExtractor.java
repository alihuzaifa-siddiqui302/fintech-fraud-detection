// com.fraudguard.util.IpExtractor
package com.fraudguard.util;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Utility component responsible for safely resolving client IP addresses across proxies, CDNs, and load balancers.
 */
@Slf4j
@Component
public class IpExtractor {

    private static final String HEADER_X_FORWARDED_FOR = "X-Forwarded-For";
    private static final String HEADER_X_REAL_IP = "X-Real-IP";
    private static final String UNKNOWN_IP = "unknown";

    /**
     * Extracts and validates the originating client IP address from request headers or remote connection.
     *
     * @param request inbound HTTP servlet request
     * @return validated IPv4 or IPv6 address string, or "unknown" if unresolvable
     */
    /**
     * Extracts and validates originating client IP address (convenience alias).
     *
     * @param request inbound HTTP request
     * @return client IP string
     */
    public String extractClientIp(HttpServletRequest request) {
        return extractIp(request);
    }

    public String extractIp(HttpServletRequest request) {
        if (request == null) {
            return UNKNOWN_IP;
        }

        // 1. Inspect X-Forwarded-For header chain
        String xForwardedFor = request.getHeader(HEADER_X_FORWARDED_FOR);
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String[] parts = xForwardedFor.split(",");
            for (String candidate : parts) {
                String trimmedCandidate = candidate.trim();
                if (isValidIp(trimmedCandidate)) {
                    log.debug("Extracted client IP from X-Forwarded-For: {}", trimmedCandidate);
                    return trimmedCandidate;
                }
            }
        }

        // 2. Fallback to X-Real-IP header
        String xRealIp = request.getHeader(HEADER_X_REAL_IP);
        if (xRealIp != null && !xRealIp.isBlank()) {
            String trimmedRealIp = xRealIp.trim();
            if (isValidIp(trimmedRealIp)) {
                log.debug("Extracted client IP from X-Real-IP: {}", trimmedRealIp);
                return trimmedRealIp;
            }
        }

        // 3. Fallback to direct TCP remote connection address
        String remoteAddress = request.getRemoteAddr();
        if (remoteAddress != null && !remoteAddress.isBlank()) {
            String trimmedRemoteAddr = remoteAddress.trim();
            if (isValidIp(trimmedRemoteAddr)) {
                log.debug("Extracted client IP from remote connection: {}", trimmedRemoteAddr);
                return trimmedRemoteAddr;
            }
        }

        log.debug("Unable to resolve valid client IP address from request; returning 'unknown'");
        return UNKNOWN_IP;
    }

    /**
     * Checks if a candidate IP string is a syntactically valid IPv4 or IPv6 address.
     *
     * @param ip candidate IP string
     * @return true if valid IP address, false otherwise
     */
    private boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank() || UNKNOWN_IP.equalsIgnoreCase(ip)) {
            return false;
        }
        try {
            InetAddress inetAddress = InetAddress.getByName(ip);
            return inetAddress != null;
        } catch (UnknownHostException exception) {
            log.trace("Candidate IP {} is not a valid network address: {}", ip, exception.getMessage());
            return false;
        }
    }
}
