// com.fraudguard.messaging.AuditEventConsumer
package com.fraudguard.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.entity.AuditLog;
import com.fraudguard.messaging.event.AuditKafkaEvent;
import com.fraudguard.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Asynchronous Kafka backup consumer persisting audit trail events into database storage with deduplication.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditEventConsumer {

    private final ObjectMapper objectMapper;
    private final AuditLogRepository auditLogRepository;

    /**
     * Consumes audit events from Kafka and reconciles missing records into the audit_logs table.
     *
     * @param record Kafka consumer record
     * @param ack manual acknowledgment handle
     */
    @KafkaListener(
            topics = AppConstants.KafkaTopics.AUDIT_EVENTS,
            groupId = "fraudguard-audit-backup",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onAuditEvent(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            AuditKafkaEvent event = objectMapper.readValue(record.value(), AuditKafkaEvent.class);

            // Deduplication verification to avoid duplicate writes
            boolean exists = (event.createdAt() != null && auditLogRepository.existsByEntityTypeAndEntityIdAndCreatedAt(
                    event.entityType(), event.entityId(), event.createdAt()
            )) || auditLogRepository.existsByEntityTypeAndEntityIdAndAction(
                    event.entityType(), event.entityId(), event.action()
            );

            if (!exists) {
                AuditLog logEntry = AuditLog.builder()
                        .actorId(event.actorId())
                        .actorEmail(event.actorEmail())
                        .action(event.action())
                        .entityType(event.entityType())
                        .entityId(event.entityId())
                        .beforeValue(event.beforeValue())
                        .afterValue(event.afterValue())
                        .ipAddress(event.ipAddress())
                        .notes("Kafka backup reconciled entry")
                        .build();

                auditLogRepository.save(logEntry);
                log.debug("Audit backup processed: action={}", event.action());
            } else {
                log.debug("Audit backup duplicate skipped: entity={}:{}", event.entityType(), event.entityId());
            }

            if (ack != null) {
                ack.acknowledge();
            }
        } catch (Exception ex) {
            log.error("Failed to process audit event record on key [{}]: {}", record.key(), ex.getMessage(), ex);
            if (ack != null) {
                ack.acknowledge();
            }
        }
    }
}
