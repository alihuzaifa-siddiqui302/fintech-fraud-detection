// com.fraudguard.config.RedisConfig
package com.fraudguard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Spring Data Redis configuration initializing high-throughput string-based serialization templates.
 */
@Configuration
public class RedisConfig {

    /**
     * Configures a thread-safe RedisTemplate for String keys and values with transaction support disabled.
     *
     * @param connectionFactory active Lettuce connection factory
     * @return configured RedisTemplate
     */
    @Bean
    public RedisTemplate<String, String> redisTemplate(LettuceConnectionFactory connectionFactory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setValueSerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setHashValueSerializer(stringSerializer);

        // Transaction support is disabled; atomic sliding-window operations are handled via Redis commands/Lua
        template.setEnableTransactionSupport(false);
        template.afterPropertiesSet();
        return template;
    }
}
