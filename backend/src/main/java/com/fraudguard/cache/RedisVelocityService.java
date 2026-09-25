// com.fraudguard.cache.RedisVelocityService
package com.fraudguard.cache;

import com.fraudguard.constant.AppConstants;
import java.time.Duration;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * High-performance sliding-window velocity tracker and brute-force attempt counter powered by Redis sorted sets.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisVelocityService {

    private static final long WINDOW_DURATION_MS = 5 * 60 * 1000L; // 5-minute sliding window
    private static final Duration VELOCITY_KEY_TTL = Duration.ofMinutes(10);
    private static final Duration FAILED_ATTEMPT_TTL = Duration.ofHours(24);

    private final RedisTemplate<String, String> redisTemplate;

    /**
     * Records a transaction under the customer's sliding window and returns current 5-minute velocity count.
     *
     * @param userId customer identifier
     * @param transactionId unique transaction identifier
     * @return current count of transactions within the 5-minute window
     */
    public long incrementAndGetUserVelocity(String userId, String transactionId) {
        if (userId == null || userId.isBlank()) {
            return 0L;
        }
        String key = AppConstants.RedisPrefixes.VELOCITY_USER + userId.trim();
        return computeSlidingWindowVelocity(key, transactionId);
    }

    /**
     * Records a transaction under the originating IP's sliding window and returns current 5-minute velocity count.
     *
     * @param ipAddress client IP address
     * @param transactionId unique transaction identifier
     * @return current count of transactions from this IP within the 5-minute window
     */
    public long incrementAndGetIpVelocity(String ipAddress, String transactionId) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return 0L;
        }
        String sanitizedIp = ipAddress.trim().replace(":", "_");
        String key = AppConstants.RedisPrefixes.VELOCITY_IP + sanitizedIp;
        return computeSlidingWindowVelocity(key, transactionId);
    }

    /**
     * Increments the 24-hour failed attempt counter for a user account upon transaction block or auth failure.
     *
     * @param userId customer identifier
     */
    public void recordFailedAttempt(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        try {
            String key = AppConstants.RedisPrefixes.FAILED_ATTEMPTS + userId.trim();
            redisTemplate.opsForValue().increment(key);
            redisTemplate.expire(key, FAILED_ATTEMPT_TTL);
            log.debug("Incremented failed attempt counter for user: {}", userId);
        } catch (Exception exception) {
            log.warn("Failed to record failed attempt in Redis for user {}: {}", userId, exception.getMessage());
        }
    }

    /**
     * Retrieves the current count of failed attempts for a customer within the last 24 hours.
     *
     * @param userId customer identifier
     * @return count of failed attempts, or 0 if absent or on Redis failure
     */
    public long getFailedAttemptsCount(String userId) {
        if (userId == null || userId.isBlank()) {
            return 0L;
        }
        try {
            String key = AppConstants.RedisPrefixes.FAILED_ATTEMPTS + userId.trim();
            String rawCount = redisTemplate.opsForValue().get(key);
            return rawCount != null ? Long.parseLong(rawCount) : 0L;
        } catch (Exception exception) {
            log.warn("Failed to retrieve failed attempts from Redis for user {}: {}", userId, exception.getMessage());
            return 0L;
        }
    }

    /**
     * Executes atomic sliding-window operations using Redis Sorted Sets (ZADD, ZREMRANGEBYSCORE, ZCARD).
     *
     * @param key Redis sorted set key
     * @param member unique transaction identifier
     * @return current member count within the rolling time window
     */
    private long computeSlidingWindowVelocity(String key, String member) {
        try {
            long nowMs = System.currentTimeMillis();
            long windowStartMs = nowMs - WINDOW_DURATION_MS;
            String memberValue = member != null ? member : String.valueOf(nowMs);

            // ZADD key nowMs memberValue
            redisTemplate.opsForZSet().add(key, memberValue, (double) nowMs);
            // ZREMRANGEBYSCORE key 0 windowStartMs
            redisTemplate.opsForZSet().removeRangeByScore(key, 0.0, (double) windowStartMs);
            // ZCARD key
            Long count = redisTemplate.opsForZSet().zCard(key);
            // EXPIRE key 10m
            redisTemplate.expire(key, VELOCITY_KEY_TTL);

            return Objects.requireNonNullElse(count, 0L);
        } catch (Exception exception) {
            log.warn("Redis velocity sliding window failed for key {}: {}. Failing open to prevent blocking checkout.",
                    key, exception.getMessage());
            return 0L;
        }
    }
}
