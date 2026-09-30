// com.fraudguard.dto.response.GraphStatsDto
package com.fraudguard.dto.response;

/**
 * Aggregated summary statistics for the active fraud syndicate network visualization.
 */
public record GraphStatsDto(
    int totalNodes,
    int totalEdges,
    int userNodes,
    int ipNodes,
    int deviceNodes,
    int blacklistedNodes,
    int highRiskNodes,
    int sharedDeviceConnections,
    int sharedIpConnections
) {}
