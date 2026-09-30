// com.fraudguard.dto.response.FraudGraphDto
package com.fraudguard.dto.response;

import java.util.List;

/**
 * Top-level network graph payload delivering node topologies, edge links, and summary metrics.
 */
public record FraudGraphDto(
    List<GraphNodeDto> nodes,
    List<GraphEdgeDto> edges,
    GraphStatsDto stats
) {}
