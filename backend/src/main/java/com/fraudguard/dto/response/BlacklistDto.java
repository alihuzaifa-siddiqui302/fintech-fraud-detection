// com.fraudguard.dto.response.BlacklistDto
package com.fraudguard.dto.response;

import java.time.OffsetDateTime;

/**
 * Representation of a blacklist record for analyst management.
 *
 * @param id database primary key
 * @param targetType classification (IP, DEVICE, EMAIL, FINGERPRINT)
 * @param targetValue blocked value
 * @param reason justification context
 * @param addedByEmail email of the analyst who added the blacklist entry
 * @param createdAt creation timestamp
 */
public record BlacklistDto(
    Long id,
    String targetType,
    String targetValue,
    String reason,
    String addedByEmail,
    OffsetDateTime createdAt
) {}
