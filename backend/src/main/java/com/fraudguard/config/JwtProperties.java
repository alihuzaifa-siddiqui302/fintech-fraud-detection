// com.fraudguard.config.JwtProperties
package com.fraudguard.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

/**
 * Type-safe configuration binding for stateless JWT security parameters.
 */
@Data
@Validated
@Configuration
@ConfigurationProperties(prefix = "fraudguard.jwt")
public class JwtProperties {

    @NotBlank(message = "JWT signing secret cannot be blank")
    private String secret = "change-me-in-production-min-32-chars!!";

    @Positive(message = "JWT expiration period must be positive milliseconds")
    private long expiryMs = 86400000L;
}
