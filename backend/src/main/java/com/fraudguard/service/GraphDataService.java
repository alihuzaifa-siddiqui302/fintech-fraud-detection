// com.fraudguard.service.GraphDataService
package com.fraudguard.service;

import com.fraudguard.dto.request.GraphQueryParams;
import com.fraudguard.dto.response.FraudGraphDto;
import com.fraudguard.dto.response.GraphEdgeDto;
import com.fraudguard.dto.response.GraphNodeDto;
import com.fraudguard.dto.response.GraphStatsDto;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.User;
import com.fraudguard.repository.BlacklistRepository;
import com.fraudguard.repository.DeviceFingerprintRepository;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.UserRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service that builds the fraud syndicate link graph by correlating shared IP addresses,
 * hardware device fingerprints, and customer accounts across evaluated transactions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GraphDataService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final DeviceFingerprintRepository deviceFingerprintRepository;
    private final BlacklistRepository blacklistRepository;

    /**
     * Builds and enriches the interactive fraud syndicate network graph from query parameters.
     *
     * @param params search seeds, depth limit, date range, and node cap
     * @return FraudGraphDto containing topologically organized nodes, edges, and syndicate KPIs
     */
    @Transactional(readOnly = true)
    public FraudGraphDto buildGraph(GraphQueryParams params) {
        if (params == null) {
            params = new GraphQueryParams();
        }

        int maxNodes = params.getMaxNodes() > 0 ? params.getMaxNodes() : 80;
        int depth = params.getDepth() > 0 ? params.getDepth() : 1;

        OffsetDateTime fromTimestamp = resolveFromTimestamp(params.getFromDate());

        log.info("Building syndicate graph: seedUser='{}' seedIp='{}' seedFp='{}' depth={} maxNodes={} fromDate={}",
                params.getSeedUserId(), params.getSeedIpAddress(), params.getSeedFingerprint(),
                depth, maxNodes, fromTimestamp);

        // Step 1: Collect seed transactions
        List<Transaction> seedTransactions = collectSeedTransactions(params, fromTimestamp, maxNodes);

        // Topologies container
        Map<String, GraphNodeDto> nodeMap = new LinkedHashMap<>();
        Map<String, GraphEdgeDto> edgeMap = new LinkedHashMap<>();

        // Aggregation tables for transactions in the active subgraph
        Map<String, Integer> userTxnCounts = new HashMap<>();
        Map<String, Integer> ipTxnCounts = new HashMap<>();
        Map<String, Integer> devTxnCounts = new HashMap<>();
        Map<String, Integer> userIpPairCounts = new HashMap<>();
        Map<String, Integer> userDevPairCounts = new HashMap<>();

        Map<String, String> ipCountryMap = new HashMap<>();
        Map<String, Boolean> ipVpnMap = new HashMap<>();
        Map<String, Boolean> ipTorMap = new HashMap<>();
        Map<String, Boolean> ipProxyMap = new HashMap<>();
        Map<String, Integer> ipqsScoreMap = new HashMap<>();

        // Process seed transactions
        for (Transaction txn : seedTransactions) {
            String uId = txn.getUserId();
            String ip = txn.getIpAddress();
            String fp = txn.getDeviceFingerprint();

            if (uId != null && !uId.isBlank()) {
                userTxnCounts.merge(uId, 1, Integer::sum);
            }

            if (ip != null && !ip.isBlank()) {
                ipTxnCounts.merge(ip, 1, Integer::sum);
                if (uId != null && !uId.isBlank()) {
                    userIpPairCounts.merge(uId + "::" + ip, 1, Integer::sum);
                }
                if (txn.getIpCountry() != null) {
                    ipCountryMap.putIfAbsent(ip, txn.getIpCountry());
                }
                ipVpnMap.putIfAbsent(ip, Boolean.TRUE.equals(txn.getIsVpn()));
                ipTorMap.putIfAbsent(ip, Boolean.TRUE.equals(txn.getIsTor()));
                ipProxyMap.putIfAbsent(ip, Boolean.TRUE.equals(txn.getIsProxy()));
                if (txn.getIpqsFraudScore() != null) {
                    ipqsScoreMap.putIfAbsent(ip, txn.getIpqsFraudScore());
                }
            }

            if (fp != null && !fp.isBlank()) {
                devTxnCounts.merge(fp, 1, Integer::sum);
                if (uId != null && !uId.isBlank()) {
                    userDevPairCounts.merge(uId + "::" + fp, 1, Integer::sum);
                }
            }
        }

        // Step 2: Build USER nodes
        for (String uId : userTxnCounts.keySet()) {
            if (nodeMap.size() >= maxNodes) break;
            createAndAddUserNode(uId, userTxnCounts.getOrDefault(uId, 1), nodeMap);
        }

        // Build IP nodes
        for (String ip : ipTxnCounts.keySet()) {
            if (nodeMap.size() >= maxNodes) break;
            createAndAddIpNode(ip, ipTxnCounts.getOrDefault(ip, 1), ipCountryMap, ipVpnMap, ipTorMap, ipProxyMap, ipqsScoreMap, nodeMap);
        }

        // Build DEVICE nodes
        for (String fp : devTxnCounts.keySet()) {
            if (nodeMap.size() >= maxNodes) break;
            createAndAddDeviceNode(fp, devTxnCounts.getOrDefault(fp, 1), fromTimestamp, nodeMap);
        }

        // Build base edges (USER -> IP and USER -> DEVICE)
        for (Map.Entry<String, Integer> entry : userIpPairCounts.entrySet()) {
            String[] parts = entry.getKey().split("::", 2);
            String uNodeId = "user_" + parts[0];
            String ipNodeId = "ip_" + parts[1];
            if (nodeMap.containsKey(uNodeId) && nodeMap.containsKey(ipNodeId)) {
                String edgeId = "edge_sub_" + parts[0] + "_" + sanitizeId(parts[1]);
                int weight = Math.min(10, Math.max(1, entry.getValue()));
                edgeMap.put(edgeId, new GraphEdgeDto(edgeId, uNodeId, ipNodeId, "SUBMITTED", entry.getValue() + " txns", weight));
            }
        }

        for (Map.Entry<String, Integer> entry : userDevPairCounts.entrySet()) {
            String[] parts = entry.getKey().split("::", 2);
            String uNodeId = "user_" + parts[0];
            String devNodeId = "dev_" + parts[1];
            if (nodeMap.containsKey(uNodeId) && nodeMap.containsKey(devNodeId)) {
                String edgeId = "edge_dev_" + parts[0] + "_" + sanitizeId(parts[1]);
                int weight = Math.min(10, Math.max(1, entry.getValue()));
                edgeMap.put(edgeId, new GraphEdgeDto(edgeId, uNodeId, devNodeId, "USED_DEVICE", entry.getValue() + " txns", weight));
            }
        }

        // Step 3: Shared Connection Discovery (Syndicate Fingerprints & IPs)
        List<String> activeDevices = new ArrayList<>(devTxnCounts.keySet());
        for (String fp : activeDevices) {
            List<String> linkedUserIds = transactionRepository.findDistinctUserIdsByFingerprint(fp, fromTimestamp);
            if (linkedUserIds.size() > 1) {
                // Ensure users are present in nodeMap
                for (String linkedUser : linkedUserIds) {
                    if (!nodeMap.containsKey("user_" + linkedUser) && nodeMap.size() < maxNodes) {
                        createAndAddUserNode(linkedUser, 1, nodeMap);
                    }
                    // Connect user to device if edge missing
                    String uNode = "user_" + linkedUser;
                    String devNode = "dev_" + fp;
                    if (nodeMap.containsKey(uNode) && nodeMap.containsKey(devNode)) {
                        String eId = "edge_dev_" + linkedUser + "_" + sanitizeId(fp);
                        edgeMap.putIfAbsent(eId, new GraphEdgeDto(eId, uNode, devNode, "USED_DEVICE", "Shared footprint", 3));
                    }
                }

                // Add SHARED_DEVICE edges between all user pairs sharing this fingerprint (STRONG FRAUD SIGNAL)
                for (int i = 0; i < linkedUserIds.size(); i++) {
                    for (int j = i + 1; j < linkedUserIds.size(); j++) {
                        String u1 = linkedUserIds.get(i);
                        String u2 = linkedUserIds.get(j);
                        if (nodeMap.containsKey("user_" + u1) && nodeMap.containsKey("user_" + u2)) {
                            String edgeId = "edge_shared_dev_" + (u1.compareTo(u2) < 0 ? u1 + "_" + u2 : u2 + "_" + u1);
                            edgeMap.put(edgeId, new GraphEdgeDto(
                                    edgeId,
                                    "user_" + u1,
                                    "user_" + u2,
                                    "SHARED_DEVICE",
                                    "Shared Device (Fraud Ring!)",
                                    9
                            ));
                        }
                    }
                }
            }
        }

        List<String> activeIps = new ArrayList<>(ipTxnCounts.keySet());
        for (String ip : activeIps) {
            List<String> linkedUserIds = transactionRepository.findDistinctUserIdsByIp(ip, fromTimestamp);
            if (linkedUserIds.size() > 1) {
                for (String linkedUser : linkedUserIds) {
                    if (!nodeMap.containsKey("user_" + linkedUser) && nodeMap.size() < maxNodes) {
                        createAndAddUserNode(linkedUser, 1, nodeMap);
                    }
                    String uNode = "user_" + linkedUser;
                    String ipNode = "ip_" + ip;
                    if (nodeMap.containsKey(uNode) && nodeMap.containsKey(ipNode)) {
                        String eId = "edge_sub_" + linkedUser + "_" + sanitizeId(ip);
                        edgeMap.putIfAbsent(eId, new GraphEdgeDto(eId, uNode, ipNode, "SUBMITTED", "Shared IP", 2));
                    }
                }

                for (int i = 0; i < linkedUserIds.size(); i++) {
                    for (int j = i + 1; j < linkedUserIds.size(); j++) {
                        String u1 = linkedUserIds.get(i);
                        String u2 = linkedUserIds.get(j);
                        if (nodeMap.containsKey("user_" + u1) && nodeMap.containsKey("user_" + u2)) {
                            String edgeId = "edge_shared_ip_" + (u1.compareTo(u2) < 0 ? u1 + "_" + u2 : u2 + "_" + u1);
                            edgeMap.putIfAbsent(edgeId, new GraphEdgeDto(
                                    edgeId,
                                    "user_" + u1,
                                    "user_" + u2,
                                    "SHARED_IP",
                                    "Shared IP (" + ip + ")",
                                    3
                            ));
                        }
                    }
                }
            }
        }

        // 2-Hop expansion if depth == 2
        if (depth >= 2 && nodeMap.size() < maxNodes) {
            expandSecondHop(nodeMap, edgeMap, fromTimestamp, maxNodes);
        }

        // Filter edges to ensure both source and target exist in final nodeMap
        List<GraphEdgeDto> cleanEdges = edgeMap.values().stream()
                .filter(e -> nodeMap.containsKey(e.source()) && nodeMap.containsKey(e.target()))
                .toList();

        List<GraphNodeDto> cleanNodes = new ArrayList<>(nodeMap.values());

        // Compile aggregate graph statistics
        GraphStatsDto stats = computeStats(cleanNodes, cleanEdges);

        log.info("Syndicate graph built: {} nodes, {} edges, {} fraud ring links",
                cleanNodes.size(), cleanEdges.size(), stats.sharedDeviceConnections());

        return new FraudGraphDto(cleanNodes, cleanEdges, stats);
    }

    private void expandSecondHop(
            Map<String, GraphNodeDto> nodeMap,
            Map<String, GraphEdgeDto> edgeMap,
            OffsetDateTime fromTimestamp,
            int maxNodes
    ) {
        Set<String> currentUserIds = new HashSet<>();
        for (GraphNodeDto node : nodeMap.values()) {
            if ("USER".equals(node.type())) {
                currentUserIds.add(node.id().replace("user_", ""));
            }
        }

        for (String uId : currentUserIds) {
            if (nodeMap.size() >= maxNodes) break;
            List<String> extraFps = transactionRepository.findDistinctFingerprintsByUser(uId);
            for (String fp : extraFps) {
                if (nodeMap.size() >= maxNodes) break;
                if (!nodeMap.containsKey("dev_" + fp)) {
                    createAndAddDeviceNode(fp, 1, fromTimestamp, nodeMap);
                }
                String eId = "edge_dev_" + uId + "_" + sanitizeId(fp);
                edgeMap.putIfAbsent(eId, new GraphEdgeDto(eId, "user_" + uId, "dev_" + fp, "USED_DEVICE", "Associated device", 2));
            }

            List<String> extraIps = transactionRepository.findDistinctIpsByUser(uId);
            for (String ip : extraIps) {
                if (nodeMap.size() >= maxNodes) break;
                if (!nodeMap.containsKey("ip_" + ip)) {
                    createAndAddIpNode(ip, 1, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), nodeMap);
                }
                String eId = "edge_sub_" + uId + "_" + sanitizeId(ip);
                edgeMap.putIfAbsent(eId, new GraphEdgeDto(eId, "user_" + uId, "ip_" + ip, "SUBMITTED", "Associated IP", 2));
            }
        }
    }

    private void createAndAddUserNode(String userId, int txnVolume, Map<String, GraphNodeDto> nodeMap) {
        User user = userRepository.findById(userId).orElse(null);
        String name = user != null ? user.getName() : "User " + userId.substring(0, Math.min(8, userId.length()));
        String email = user != null ? user.getEmail() : "user_" + userId.substring(0, Math.min(6, userId.length())) + "@unknown.com";

        Double avgScoreVal = transactionRepository.findAvgRiskScoreByUser(userId);
        double avgScore = avgScoreVal != null ? avgScoreVal : 0.0;

        boolean isBlacklisted = blacklistRepository.existsByTargetTypeAndTargetValue("EMAIL", email);

        String riskLevel;
        if (isBlacklisted || avgScore >= 70.0) {
            riskLevel = "HIGH";
        } else if (avgScore >= 30.0) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        long accountAgeDays = 0;
        if (user != null && user.getCreatedAt() != null) {
            accountAgeDays = Math.max(0, ChronoUnit.DAYS.between(user.getCreatedAt(), OffsetDateTime.now()));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("email", email);
        data.put("name", name);
        data.put("accountAgeDays", accountAgeDays);
        data.put("totalTransactions", txnVolume);
        data.put("avgRiskScore", Math.round(avgScore * 10.0) / 10.0);
        data.put("homeCountry", user != null ? user.getHomeCountry() : "US");

        GraphNodeDto node = new GraphNodeDto(
                "user_" + userId,
                "USER",
                name,
                riskLevel,
                isBlacklisted,
                data
        );
        nodeMap.put(node.id(), node);
    }

    private void createAndAddIpNode(
            String ip,
            int txnVolume,
            Map<String, String> ipCountryMap,
            Map<String, Boolean> ipVpnMap,
            Map<String, Boolean> ipTorMap,
            Map<String, Boolean> ipProxyMap,
            Map<String, Integer> ipqsScoreMap,
            Map<String, GraphNodeDto> nodeMap
    ) {
        boolean isBlacklisted = blacklistRepository.existsByTargetTypeAndTargetValue("IP", ip);
        String country = ipCountryMap.getOrDefault(ip, "US");
        boolean isVpn = Boolean.TRUE.equals(ipVpnMap.get(ip));
        boolean isTor = Boolean.TRUE.equals(ipTorMap.get(ip));
        boolean isProxy = Boolean.TRUE.equals(ipProxyMap.get(ip));
        int ipqs = ipqsScoreMap.getOrDefault(ip, 0);

        String riskLevel;
        if (isBlacklisted || isTor || ipqs >= 75) {
            riskLevel = "HIGH";
        } else if (isVpn || isProxy || ipqs >= 40) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        Map<String, Object> data = new HashMap<>();
        data.put("ipAddress", ip);
        data.put("country", country);
        data.put("isVpn", isVpn);
        data.put("isTor", isTor);
        data.put("isProxy", isProxy);
        data.put("transactionCount", txnVolume);
        data.put("ipqsScore", ipqs);

        GraphNodeDto node = new GraphNodeDto(
                "ip_" + ip,
                "IP",
                ip,
                riskLevel,
                isBlacklisted,
                data
        );
        nodeMap.put(node.id(), node);
    }

    private void createAndAddDeviceNode(
            String fp,
            int txnVolume,
            OffsetDateTime fromTimestamp,
            Map<String, GraphNodeDto> nodeMap
    ) {
        boolean isBlacklisted = blacklistRepository.existsByTargetTypeAndTargetValue("DEVICE", fp)
                || blacklistRepository.existsByTargetTypeAndTargetValue("FINGERPRINT", fp);

        long sharedCount = deviceFingerprintRepository.countDistinctUsersByFingerprintHash(fp);
        if (sharedCount == 0) {
            sharedCount = transactionRepository.findDistinctUserIdsByFingerprint(fp, fromTimestamp).size();
        }

        String riskLevel = (isBlacklisted || sharedCount > 1) ? "HIGH" : "LOW";
        String shortFp = fp.length() > 16 ? fp.substring(0, 16) : fp;

        Map<String, Object> data = new HashMap<>();
        data.put("fingerprint", fp);
        data.put("fingerprintShort", shortFp);
        data.put("sharedAcrossAccounts", sharedCount);
        data.put("transactionCount", txnVolume);

        GraphNodeDto node = new GraphNodeDto(
                "dev_" + fp,
                "DEVICE",
                shortFp,
                riskLevel,
                isBlacklisted,
                data
        );
        nodeMap.put(node.id(), node);
    }

    private List<Transaction> collectSeedTransactions(GraphQueryParams params, OffsetDateTime fromTimestamp, int maxNodes) {
        Pageable pageable = PageRequest.of(0, Math.min(maxNodes, 100));

        if (params.getSeedUserId() != null && !params.getSeedUserId().isBlank()) {
            String cleanUserId = params.getSeedUserId().trim().replaceFirst("(?i)^user_", "");
            return transactionRepository.findSeedTransactionsByUser(cleanUserId, fromTimestamp, pageable);
        }

        if (params.getSeedIpAddress() != null && !params.getSeedIpAddress().isBlank()) {
            String cleanIp = params.getSeedIpAddress().trim().replaceFirst("(?i)^ip_", "");
            return transactionRepository.findSeedTransactionsByIp(cleanIp, fromTimestamp, pageable);
        }

        if (params.getSeedFingerprint() != null && !params.getSeedFingerprint().isBlank()) {
            String cleanFp = params.getSeedFingerprint().trim().replaceFirst("(?i)^(device_|dev_)", "");
            return transactionRepository.findSeedTransactionsByFingerprint(cleanFp, fromTimestamp, pageable);
        }

        // Default: last 24h/fromTimestamp suspicious transactions score >= 50
        List<Transaction> suspicious = transactionRepository.findSuspiciousSeedTransactions(50, fromTimestamp, pageable);
        if (!suspicious.isEmpty()) {
            return suspicious;
        }

        // Fallback: recent transactions so graph is populated for demonstrations
        return transactionRepository.findRecentSeedTransactions(fromTimestamp, pageable);
    }

    private OffsetDateTime resolveFromTimestamp(String fromDate) {
        if (fromDate != null && !fromDate.isBlank()) {
            try {
                LocalDate parsed = LocalDate.parse(fromDate.trim());
                return parsed.atStartOfDay().atOffset(ZoneOffset.UTC);
            } catch (Exception ex) {
                log.warn("Invalid fromDate format [{}], falling back to default timeframe: {}", fromDate, ex.getMessage());
            }
        }
        return OffsetDateTime.now().minusDays(7);
    }

    private String sanitizeId(String val) {
        return val.replaceAll("[^a-zA-Z0-9_-]", "_");
    }

    private GraphStatsDto computeStats(List<GraphNodeDto> nodes, List<GraphEdgeDto> edges) {
        int userNodes = 0;
        int ipNodes = 0;
        int deviceNodes = 0;
        int blacklistedNodes = 0;
        int highRiskNodes = 0;

        for (GraphNodeDto n : nodes) {
            if ("USER".equals(n.type())) userNodes++;
            else if ("IP".equals(n.type())) ipNodes++;
            else if ("DEVICE".equals(n.type())) deviceNodes++;

            if (n.isBlacklisted()) blacklistedNodes++;
            if ("HIGH".equals(n.riskLevel())) highRiskNodes++;
        }

        int sharedDeviceConnections = 0;
        int sharedIpConnections = 0;

        for (GraphEdgeDto e : edges) {
            if ("SHARED_DEVICE".equals(e.type())) sharedDeviceConnections++;
            else if ("SHARED_IP".equals(e.type())) sharedIpConnections++;
        }

        return new GraphStatsDto(
                nodes.size(),
                edges.size(),
                userNodes,
                ipNodes,
                deviceNodes,
                blacklistedNodes,
                highRiskNodes,
                sharedDeviceConnections,
                sharedIpConnections
        );
    }
}
