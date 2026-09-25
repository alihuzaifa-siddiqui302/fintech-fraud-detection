// com.fraudguard.cache.RuleCacheService
package com.fraudguard.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.entity.FraudRule;
import com.fraudguard.repository.FraudRuleRepository;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * High-performance cache for fraud detection heuristics with 5-minute TTL and on-demand invalidation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RuleCacheService {

    private static final Duration RULE_CACHE_TTL = Duration.ofMinutes(5);

    private final RedisTemplate<String, String> redisTemplate;
    private final FraudRuleRepository fraudRuleRepository;
    private final ObjectMapper objectMapper;

    /**
     * Retrieves all active fraud rules mapped by rule code, reading from Redis or querying PostgreSQL.
     *
     * @return Map of rule code to active FraudRule entity
     */
    public Map<String, FraudRule> loadActiveRules() {
        String key = AppConstants.RedisPrefixes.RULES_ACTIVE;

        try {
            String cachedJson = redisTemplate.opsForValue().get(key);
            if (cachedJson != null && !cachedJson.isBlank()) {
                log.debug("Loaded active fraud rules from Redis cache");
                return objectMapper.readValue(cachedJson, new TypeReference<LinkedHashMap<String, FraudRule>>() {});
            }
        } catch (Exception exception) {
            log.warn("Failed to read rules from Redis cache: {}. Falling back to PostgreSQL.", exception.getMessage());
        }

        // Cache miss or Redis error — query PostgreSQL database
        List<FraudRule> activeRulesList = fraudRuleRepository.findByIsEnabledTrueOrderByRiskWeightDesc();
        Map<String, FraudRule> rulesMap = activeRulesList.stream()
                .collect(Collectors.toMap(
                        FraudRule::getRuleCode,
                        rule -> rule,
                        (existing, replacement) -> existing,
                        LinkedHashMap::new
                ));

        // Populate Redis cache asynchronously/safely
        try {
            String serialized = objectMapper.writeValueAsString(rulesMap);
            redisTemplate.opsForValue().set(key, serialized, RULE_CACHE_TTL);
            log.debug("Populated active fraud rules into Redis cache with 5m TTL");
        } catch (Exception exception) {
            log.warn("Failed to populate active rules into Redis cache: {}", exception.getMessage());
        }

        return Collections.unmodifiableMap(rulesMap);
    }

    /**
     * Purges the cached active rulebook from Redis upon administrative threshold or weight calibrations.
     */
    public void invalidateCache() {
        try {
            redisTemplate.delete(AppConstants.RedisPrefixes.RULES_ACTIVE);
            log.info("Rule cache invalidated — will reload on next evaluation");
        } catch (Exception exception) {
            log.warn("Failed to delete rule cache from Redis: {}", exception.getMessage());
        }
    }

    /**
     * Looks up an individual active rule by its rule code from the cached rule catalog.
     *
     * @param ruleCode unique rule identifier
     * @return Optional containing matched FraudRule or empty if not active
     */
    public Optional<FraudRule> getRuleByCode(String ruleCode) {
        if (ruleCode == null || ruleCode.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(loadActiveRules().get(ruleCode.trim()));
    }
}
