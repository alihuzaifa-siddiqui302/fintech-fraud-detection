// com.fraudguard.messaging.FraudGuardEventProducer
package com.fraudguard.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.messaging.event.AuditKafkaEvent;
import com.fraudguard.messaging.event.TransactionKafkaEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Resilient event publisher dispatching transaction and audit streaming messages over Apache Kafka.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FraudGuardEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Publishes an evaluated transaction event to the raw transactions topic asynchronously.
     *
     * @param event transaction streaming event contract
     */
    public void publishTransaction(TransactionKafkaEvent event) {
        if (event == null || event.transactionId() == null) {
            log.warn("Cannot publish null transaction event to Kafka");
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(AppConstants.KafkaTopics.TXN_RAW, event.transactionId(), payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Failed to publish transaction event [{}] to Kafka topic [{}]: {}",
                                    event.transactionId(), AppConstants.KafkaTopics.TXN_RAW, ex.getMessage());
                        } else {
                            log.debug("Successfully published transaction [{}] to Kafka topic [{}]",
                                    event.transactionId(), AppConstants.KafkaTopics.TXN_RAW);
                        }
                    });
        } catch (Exception ex) {
            log.warn("Serialization or dispatch error for transaction [{}] on Kafka: {}",
                    event.transactionId(), ex.getMessage());
        }
    }

    /**
     * Publishes an immutable compliance audit event to the audit events topic asynchronously.
     *
     * @param event audit streaming event contract
     */
    public void publishAuditEvent(AuditKafkaEvent event) {
        if (event == null || event.entityId() == null) {
            log.warn("Cannot publish null audit event to Kafka");
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(AppConstants.KafkaTopics.AUDIT_EVENTS, event.entityId(), payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Failed to publish audit event for entity [{}:{}] to Kafka: {}",
                                    event.entityType(), event.entityId(), ex.getMessage());
                        } else {
                            log.debug("Successfully published audit event for entity [{}:{}] to Kafka",
                                    event.entityType(), event.entityId());
                        }
                    });
        } catch (Exception ex) {
            log.warn("Serialization or dispatch error for audit event [{}:{}] on Kafka: {}",
                    event.entityType(), event.entityId(), ex.getMessage());
        }
    }
}
