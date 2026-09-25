// com.fraudguard.cache.BlacklistCacheService
package com.fraudguard.cache;

import com.fraudguard.constant.AppConstants;
import com.fraudguard.entity.Blacklist;
import com.fraudguard.repository.BlacklistRepository;
import jakarta.annotation.PostConstruct;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * In-memory distributed blacklist cache providing sub-millisecond negative match lookups with relational database fallback.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BlacklistCacheService {

    private static final String BLACKLIST_MARKER = "1";

    private final RedisTemplate<String, String> redisTemplate;
    private final BlacklistRepository blacklistRepository;

    /**
     * Warms the Redis in-memory cache with all active blacklist entries from PostgreSQL on startup.
     */
    @PostConstruct
    public void warmCache() {
        try {
            List<Blacklist> allEntries = blacklistRepository.findAll();
            int count = 0;
            for (Blacklist entry : allEntries) {
                String key = buildCacheKey(entry.getTargetType(), entry.getTargetValue());
                redisTemplate.opsForValue().set(key, BLACKLIST_MARKER);
                count++;
            }
            log.info("Blacklist cache warmed: {} entries", count);
        } catch (Exception exception) {
            log.warn("Failed to warm blacklist cache on startup: {}. Cache will populate dynamically.", exception.getMessage());
        }
    }

    /**
     * Checks if a target identifier is blacklisted, verifying Redis first and falling back to PostgreSQL if Redis fails.
     *
     * @param targetType classification type (IP, DEVICE, EMAIL, FINGERPRINT)
     * @param targetValue target identifier
     * @return true if target is actively blacklisted, false otherwise
     */
    public boolean isBlacklisted(String targetType, String targetValue) {
        if (targetType == null || targetValue == null || targetValue.isBlank()) {
            return false;
        }

        String key = buildCacheKey(targetType, targetValue);
        try {
            Boolean hasKey = redisTemplate.hasKey(key);
            if (Boolean.TRUE.equals(hasKey)) {
                return true;
            }
        } catch (Exception exception) {
            log.warn("Redis blacklist lookup failed for key {}: {}. Falling back to PostgreSQL.", key, exception.getMessage());
            return blacklistRepository.existsByTargetTypeAndTargetValue(targetType.trim(), targetValue.trim());
        }

        return false;
    }

    /**
     * Adds an entry directly to the Redis in-memory blacklist cache.
     *
     * @param targetType classification type
     * @param targetValue target identifier
     */
    public void addToCache(String targetType, String targetValue) {
        if (targetType == null || targetValue == null) {
            return;
        }
        try {
            String key = buildCacheKey(targetType, targetValue);
            redisTemplate.opsForValue().set(key, BLACKLIST_MARKER);
            log.debug("Added entry to blacklist cache: {}", key);
        } catch (Exception exception) {
            log.warn("Failed to add entry to Redis blacklist cache: {}", exception.getMessage());
        }
    }

    /**
     * Removes an entry from the Redis in-memory blacklist cache upon administrative unblocking.
     *
     * @param targetType classification type
     * @param targetValue target identifier
     */
    public void removeFromCache(String targetType, String targetValue) {
        if (targetType == null || targetValue == null) {
            return;
        }
        try {
            String key = buildCacheKey(targetType, targetValue);
            redisTemplate.delete(key);
            log.debug("Removed entry from blacklist cache: {}", key);
        } catch (Exception exception) {
            log.warn("Failed to remove entry from Redis blacklist cache: {}", exception.getMessage());
        }
    }

    /**
     * Constructs a namespaced Redis key for a blacklist target type and value.
     */
    private String buildCacheKey(String targetType, String targetValue) {
        return AppConstants.RedisPrefixes.BLACKLIST + targetType.trim().toUpperCase() + ":" + targetValue.trim();
    }
}
