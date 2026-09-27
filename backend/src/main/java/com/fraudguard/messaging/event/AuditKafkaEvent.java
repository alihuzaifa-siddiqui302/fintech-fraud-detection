// com.fraudguard.messaging.event.AuditKafkaEvent
package com.fraudguard.messaging.event;

import java.time.OffsetDateTime;

/**
 * Immutable streaming event payload for compliance audit trail synchronization across Kafka.
 *
 * @param actorId unique actor identifier (UUID)
 * @param actorEmail actor email address
 * @param action operational or adjudication action code
 * @param entityType domain entity type
 * @param entityId target entity identifier
 * @param beforeValue JSON snapshot before modification
 * @param afterValue JSON snapshot after modification
 * @param ipAddress IP address of actor
 * @param createdAt action creation timestamp
 */
public record AuditKafkaEvent(
        String actorId,
        String actorEmail,
        String action,
        String entityType,
        String entityId,
        String beforeValue,
        String afterValue,
        String ipAddress,
        OffsetDateTime createdAt
) {}
