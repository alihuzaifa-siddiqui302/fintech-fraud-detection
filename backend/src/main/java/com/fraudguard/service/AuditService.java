// com.fraudguard.service.AuditService
package com.fraudguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.entity.AuditLog;
import com.fraudguard.event.AuditKafkaEvent;
import com.fraudguard.repository.AuditLogRepository;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Enterprise compliance audit service capturing operational modifications and streaming audit logs to Kafka.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;

    /**
     * Records an immutable administrative or adjudication audit event.
     *
     * @param actorId unique actor identifier (UUID)
     * @param actorEmail actor email address
     * @param action action classification code
     * @param entityType domain entity type (e.g. TRANSACTION, BLACKLIST, FRAUD_RULE)
     * @param entityId target entity identifier
     * @param before previous state object before modification
     * @param after updated state object after modification
     * @param ipAddress IP address of actor performing operation
     * @param notes justification or resolution notes
     */
    @Transactional
    public void log(
            String actorId,
            String actorEmail,
            String action,
            String entityType,
            String entityId,
            Object before,
            Object after,
            String ipAddress,
            String notes
    ) {
        String beforeJson = serializeSafe(before);
        String afterJson = serializeSafe(after);

        AuditLog auditLog = AuditLog.builder()
                .actorId(actorId)
                .actorEmail(actorEmail)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .beforeValue(beforeJson)
                .afterValue(afterJson)
                .ipAddress(ipAddress)
                .notes(notes)
                .build();

        auditLogRepository.save(auditLog);

        log.info("AUDIT | actor={} | action={} | entity={}:{}", actorEmail, action, entityType, entityId);

        // Secondary asynchronous Kafka broadcast
        try {
            AuditKafkaEvent event = AuditKafkaEvent.builder()
                    .actorId(actorId)
                    .actorEmail(actorEmail)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .ipAddress(ipAddress)
                    .notes(notes)
                    .timestamp(OffsetDateTime.now())
                    .build();

            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(AppConstants.KafkaTopics.AUDIT_EVENTS, entityId, payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Kafka audit event publication failed for entity [{}:{}]: {}",
                                    entityType, entityId, ex.getMessage());
                        }
                    });
        } catch (Exception ex) {
            log.warn("Failed to dispatch audit event to Kafka: {}", ex.getMessage());
        }
    }

    private String serializeSafe(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof String str) {
            return str;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception ex) {
            log.warn("Could not serialize audit object to JSON: {}", ex.getMessage());
            return String.valueOf(obj);
        }
    }
}
