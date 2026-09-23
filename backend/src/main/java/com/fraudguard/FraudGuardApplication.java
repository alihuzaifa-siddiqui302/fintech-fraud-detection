// com.fraudguard.FraudGuardApplication
package com.fraudguard;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application entry point for FraudGuard Fintech Fraud Detection &amp; Compliance Platform.
 */
@Slf4j
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class FraudGuardApplication {

    /**
     * Boots the Spring Boot application context.
     *
     * @param args runtime command-line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(FraudGuardApplication.class, args);
    }

    /**
     * Initializes core engine telemetry banner upon startup.
     *
     * @return CommandLineRunner callback bean
     */
    @Bean
    public CommandLineRunner initializationBannerRunner() {
        return args -> {
            log.info("═══════════════════════════════════════");
            log.info("  FraudGuard Risk Engine — ONLINE");
            log.info("═══════════════════════════════════════");
        };
    }
}
