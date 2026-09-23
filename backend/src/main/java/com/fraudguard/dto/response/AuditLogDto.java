// com.fraudguard.dto.response.AuditLogDto
package com.fraudguard.dto.response;

import java.time.OffsetDateTime;

/**
 * Representation of an immutable audit trail entry for regulatory reviews.
 *
 * @param id database primary key
 * @param actorEmail email of user who performed action
 * @param action action classification string
 * @param entityType domain entity modified
 * @param entityId target entity identifier
 * @param beforeValue JSON snapshot before change
 * @param afterValue JSON snapshot after change
 * @param ipAddress IP address of actor
 * @param notes administrative context notes
 * @param createdAt action timestamp
 */
public record AuditLogDto(
    Long id,
    String actorEmail,
    String action,
    String entityType,
    String entityId,
    String beforeValue,
    String afterValue,
    String ipAddress,
    String notes,
    OffsetDateTime createdAt
) {}
