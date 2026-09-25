// com.fraudguard.client.IpQualityScoreClient
package com.fraudguard.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * HTTP client communicating with IPQualityScore for enterprise VPN, Tor, and proxy reputation scoring.
 */
@Slf4j
@Component
public class IpQualityScoreClient {

    private static final Duration CACHE_TTL = Duration.ofHours(6);

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;

    /**
     * Constructs IpQualityScoreClient with timeout-bounded RestTemplate and Redis cache.
     *
     * @param redisTemplate Redis template for response caching
     * @param objectMapper Jackson serializer
     * @param apiKey IPQS secret authentication key
     * @param baseUrl IPQS base API endpoint
     */
    public IpQualityScoreClient(
            RedisTemplate<String, String> redisTemplate,
            ObjectMapper objectMapper,
            @Value("${fraudguard.external.ipqualityscore.api-key:}") String apiKey,
            @Value("${fraudguard.external.ipqualityscore.base-url:https://www.ipqualityscore.com/api/json/ip}") String baseUrl
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(4000);
        requestFactory.setReadTimeout(4000);
        this.restTemplate = new RestTemplate(requestFactory);
    }

    /**
     * Executes external IPQS reputation analysis with 6-hour caching and fail-safe defaults.
     *
     * @param ipAddress IP address to evaluate
     * @return IpqsResponse containing fraud score, VPN, Tor, and proxy telemetry
     */
    public IpqsResponse lookup(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank() || "unknown".equalsIgnoreCase(ipAddress)) {
            return IpqsResponse.empty();
        }

        if (apiKey.isBlank()) {
            log.debug("IPQS key not configured, skipping external reputation lookup for IP: {}", ipAddress);
            return IpqsResponse.empty();
        }

        String sanitizedIp = ipAddress.trim();
        String cacheKey = AppConstants.RedisPrefixes.IPQS_CACHE + sanitizedIp;

        // 1. Inspect Redis Cache
        try {
            String cachedJson = redisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                log.debug("IPQS cache hit for IP: {}", sanitizedIp);
                return objectMapper.readValue(cachedJson, IpqsResponse.class);
            }
        } catch (Exception exception) {
            log.warn("Redis read failure for IPQS cache key {}: {}", cacheKey, exception.getMessage());
        }

        // 2. Outbound HTTP Request
        String url = String.format("%s/%s/%s?strictness=1&allow_public_access_points=true&fast=false&lighter_penalties=true",
                baseUrl, apiKey, sanitizedIp);

        try {
            log.debug("Executing external IPQS query for IP: {}", sanitizedIp);
            IpqsResponse response = restTemplate.getForObject(url, IpqsResponse.class);

            if (response == null || (!response.success() && response.fraudScore() == 0)) {
                log.warn("IPQS returned unsuccessful or empty response for IP: {}; treating as unavailable", sanitizedIp);
                return IpqsResponse.empty();
            }

            // Cache valid response in Redis for 6 hours
            try {
                String serialized = objectMapper.writeValueAsString(response);
                redisTemplate.opsForValue().set(cacheKey, serialized, CACHE_TTL);
            } catch (Exception cacheException) {
                log.warn("Failed to cache IPQS response in Redis for IP {}: {}", sanitizedIp, cacheException.getMessage());
            }

            return response;
        } catch (RestClientException | IllegalArgumentException exception) {
            log.warn("External IPQS lookup failed for IP {}: {}. Failing open.", sanitizedIp, exception.getMessage());
            return IpqsResponse.empty();
        }
    }

    /**
     * JSON response schema for IPQualityScore response payload.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record IpqsResponse(
            boolean success,
            @JsonProperty("fraud_score") int fraudScore,
            boolean vpn,
            boolean tor,
            boolean proxy,
            @JsonProperty("active_vpn") boolean activeVpn,
            @JsonProperty("active_tor") boolean activeTor,
            @JsonProperty("bot_status") boolean botStatus,
            @JsonProperty("is_crawler") boolean isCrawler,
            @JsonProperty("connection_type") String connectionType,
            boolean mobile,
            @JsonProperty("country_code") String countryCode,
            @JsonProperty("ISP") String isp
    ) {
        /**
         * Factory providing empty default response when service is unconfigured or unreachable.
         */
        public static IpqsResponse empty() {
            return new IpqsResponse(false, 0, false, false, false, false, false, false, false, "Unknown", false, null, null);
        }
    }
}
