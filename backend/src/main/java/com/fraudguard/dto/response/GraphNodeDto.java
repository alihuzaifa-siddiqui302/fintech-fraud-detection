// com.fraudguard.dto.response.GraphNodeDto
package com.fraudguard.dto.response;

import java.util.Map;

/**
 * Node payload representing an investigative entity (USER, IP, DEVICE, or EMAIL) in the syndicate graph.
 */
public record GraphNodeDto(
    String id,
    String type,
    String label,
    String riskLevel,
    boolean isBlacklisted,
    Map<String, Object> data
) {}
