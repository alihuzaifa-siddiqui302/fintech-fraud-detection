// com.fraudguard.event.AuditKafkaEvent
package com.fraudguard.event;

import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Event payload broadcast to Apache Kafka for immutable regulatory audit trail replication.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditKafkaEvent {

    private String actorId;
    private String actorEmail;
    private String action;
    private String entityType;
    private String entityId;
    private String ipAddress;
    private String notes;
    private OffsetDateTime timestamp;
}
