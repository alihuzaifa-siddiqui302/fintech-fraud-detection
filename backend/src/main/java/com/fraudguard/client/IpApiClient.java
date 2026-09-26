// com.fraudguard.client.IpApiClient
package com.fraudguard.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * HTTP client communicating with ip-api.com for external IP geolocation, ASN, and hosting provider detection.
 */
@Slf4j
@Component
public class IpApiClient {

    private static final Duration CACHE_TTL = Duration.ofHours(24);

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    /**
     * Constructs IpApiClient with timeout-bounded RestTemplate and Redis cache.
     *
     * @param redisTemplate Redis template for response caching
     * @param objectMapper Jackson serializer
     * @param baseUrl external API base endpoint
     */
    public IpApiClient(
            RedisTemplate<String, String> redisTemplate,
            ObjectMapper objectMapper,
            @Value("${fraudguard.external.ipapi.base-url:http://ip-api.com/json}") String baseUrl
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3000);
        requestFactory.setReadTimeout(3000);
        this.restTemplate = new RestTemplate(requestFactory);
    }

    /**
     * Performs an enriched IP lookup with a 24-hour Redis caching layer and fail-open fault tolerance.
     *
     * @param ipAddress IP address to evaluate
     * @return IpApiResponse containing geolocation and hosting indicators
     */
    public IpApiResponse lookup(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank() || "unknown".equalsIgnoreCase(ipAddress)) {
            return IpApiResponse.empty();
        }

        String sanitizedIp = ipAddress.trim();
        String cacheKey = AppConstants.RedisPrefixes.IPAPI_CACHE + sanitizedIp;

        // 1. Check Redis Cache
        try {
            String cachedJson = redisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                log.debug("IP-API cache hit for IP: {}", sanitizedIp);
                return objectMapper.readValue(cachedJson, IpApiResponse.class);
            }
        } catch (Exception exception) {
            log.warn("Redis read failure for IP-API cache key {}: {}", cacheKey, exception.getMessage());
        }

        // 2. Outbound HTTP Request
        String url = String.format("%s/%s?fields=status,country,countryCode,city,isp,org,proxy,hosting,query",
                baseUrl, sanitizedIp);

        try {
            log.debug("Executing external IP-API lookup for IP: {}", sanitizedIp);
            IpApiResponse response = restTemplate.getForObject(url, IpApiResponse.class);
            if (response == null) {
                return IpApiResponse.empty();
            }

            // Cache result in Redis for 24 hours
            try {
                String serialized = objectMapper.writeValueAsString(response);
                redisTemplate.opsForValue().set(cacheKey, serialized, CACHE_TTL);
            } catch (Exception cacheException) {
                log.warn("Failed to cache IP-API response in Redis for IP {}: {}", sanitizedIp, cacheException.getMessage());
            }

            return response;
        } catch (RestClientException | IllegalArgumentException exception) {
            log.warn("External IP-API lookup failed for IP {}: {}. Failing open.", sanitizedIp, exception.getMessage());
            return IpApiResponse.empty();
        }
    }

    /**
     * Inbound JSON response schema from ip-api.com.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record IpApiResponse(
            String status,
            String country,
            String countryCode,
            String city,
            String isp,
            String org,
            String query,
            String timezone,
            boolean proxy,
            boolean hosting
    ) {
        /**
         * Factory method providing a safe empty fallback instance.
         */
        public static IpApiResponse empty() {
            return new IpApiResponse("fail", null, null, null, null, null, null, null, false, false);
        }
    }
}
