// com.fraudguard.dto.response.GraphEdgeDto
package com.fraudguard.dto.response;

/**
 * Edge payload representing a relational interaction or shared footprint between two graph entities.
 */
public record GraphEdgeDto(
    String id,
    String source,
    String target,
    String type,
    String label,
    int weight
) {}
