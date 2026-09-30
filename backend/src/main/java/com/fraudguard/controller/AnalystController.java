// com.fraudguard.controller.AnalystController
package com.fraudguard.controller;

import com.fraudguard.dto.request.AddBlacklistRequest;
import com.fraudguard.dto.request.AdjudicateRequest;
import com.fraudguard.dto.request.GraphQueryParams;
import com.fraudguard.dto.request.SarStatusUpdateRequest;
import com.fraudguard.dto.request.UpdateRuleRequest;
import com.fraudguard.dto.response.AnalystTransactionDto;
import com.fraudguard.dto.response.AuditLogDto;
import com.fraudguard.dto.response.BlacklistDto;
import com.fraudguard.dto.response.FraudGraphDto;
import com.fraudguard.dto.response.FraudRuleDto;
import com.fraudguard.dto.response.MetricsDto;
import com.fraudguard.dto.response.PagedResponse;
import com.fraudguard.dto.response.SarReportDto;
import com.fraudguard.entity.Transaction;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.service.AnalystService;
import com.fraudguard.service.GraphDataService;
import com.fraudguard.service.SarService;
import com.fraudguard.util.IpExtractor;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * REST controller exposing fraud analyst capabilities including queue monitoring, adjudication, rule configuration, and real-time streaming.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analyst")
@PreAuthorize("hasRole('ANALYST')")
@RequiredArgsConstructor
public class AnalystController {

    private final AnalystService analystService;
    private final SarService sarService;
    private final IpExtractor ipExtractor;
    private final GraphDataService graphDataService;
    private final TransactionRepository transactionRepository;

    /**
     * Retrieves high-level operational fraud KPIs and volume metrics aggregated over the trailing 24 hours.
     *
     * @return ResponseEntity containing MetricsDto
     */
    @GetMapping("/metrics")
    public ResponseEntity<MetricsDto> getMetrics() {
        return ResponseEntity.ok(analystService.getMetrics());
    }

    /**
     * Searches and paginates flagged and evaluated transactions across multiple investigative criteria.
     *
     * @param status status filter (default ALL)
     * @param page zero-based page index (default 0)
     * @param size page size (default 20)
     * @param search optional keyword matching IP address or transaction ID prefix
     * @return ResponseEntity containing PagedResponse of AnalystTransactionDto
     */
    @GetMapping("/transactions")
    public ResponseEntity<PagedResponse<AnalystTransactionDto>> getTransactions(
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(analystService.getTransactions(status, page, size, search));
    }

    /**
     * Retrieves full transaction details with telemetry signals, geo metadata, and detailed rule trigger breakdowns.
     *
     * @param id transaction UUID
     * @return ResponseEntity containing AnalystTransactionDto
     */
    @GetMapping("/transactions/{id}")
    public ResponseEntity<AnalystTransactionDto> getTransactionById(@PathVariable String id) {
        return ResponseEntity.ok(analystService.getTransactionById(id));
    }

    /**
     * Adjudicates a flagged transaction in PENDING_REVIEW status to either APPROVE or BLOCK with mandatory notes.
     *
     * @param id transaction UUID
     * @param request validated adjudication action payload
     * @param httpRequest HTTP servlet request
     * @return ResponseEntity containing updated AnalystTransactionDto
     */
    @PostMapping("/transactions/{id}/adjudicate")
    public ResponseEntity<AnalystTransactionDto> adjudicate(
            @PathVariable String id,
            @Valid @RequestBody AdjudicateRequest request,
            HttpServletRequest httpRequest
    ) {
        String analystEmail = getAuthenticatedEmail();
        String clientIp = ipExtractor.extractClientIp(httpRequest);

        log.info("Analyst [{}] adjudicating transaction [{}] with decision [{}]",
                analystEmail, id, request.getAction());

        AnalystTransactionDto updated = analystService.adjudicate(id, request, analystEmail, clientIp);
        return ResponseEntity.ok(updated);
    }

    /**
     * Lists all global blacklist entries, optionally filtered by target entity type.
     *
     * @param targetType optional filter (e.g. IP, DEVICE, EMAIL, FINGERPRINT)
     * @return ResponseEntity containing List of BlacklistDto
     */
    @GetMapping("/blacklists")
    public ResponseEntity<List<BlacklistDto>> getBlacklists(
            @RequestParam(required = false) String targetType
    ) {
        return ResponseEntity.ok(analystService.getBlacklists(targetType));
    }

    /**
     * Adds a new entity to the global negative-match blacklist.
     *
     * @param request validated blacklist entry request
     * @param httpRequest HTTP servlet request
     * @return ResponseEntity containing created BlacklistDto with 201 Created status
     */
    @PostMapping("/blacklists")
    public ResponseEntity<BlacklistDto> addBlacklist(
            @Valid @RequestBody AddBlacklistRequest request,
            HttpServletRequest httpRequest
    ) {
        String analystEmail = getAuthenticatedEmail();
        String clientIp = ipExtractor.extractClientIp(httpRequest);

        BlacklistDto created = analystService.addBlacklist(request, analystEmail, clientIp);
        URI location = URI.create("/api/v1/analyst/blacklists/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    /**
     * Removes an entry from the global blacklist.
     *
     * @param id blacklist database primary key
     * @param httpRequest HTTP servlet request
     * @return ResponseEntity with 204 No Content
     */
    @DeleteMapping("/blacklists/{id}")
    public ResponseEntity<Void> deleteBlacklist(
            @PathVariable Long id,
            HttpServletRequest httpRequest
    ) {
        String analystEmail = getAuthenticatedEmail();
        String clientIp = ipExtractor.extractClientIp(httpRequest);

        analystService.deleteBlacklist(id, analystEmail, clientIp);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieves all fraud detection rules sorted by risk weight descending.
     *
     * @return ResponseEntity containing List of FraudRuleDto
     */
    @GetMapping("/rules")
    public ResponseEntity<List<FraudRuleDto>> getRules() {
        return ResponseEntity.ok(analystService.getRules());
    }

    /**
     * Recalibrates a fraud detection rule threshold, risk weight, or enabled flag.
     *
     * @param id rule database primary key
     * @param request validated update request
     * @param httpRequest HTTP servlet request
     * @return ResponseEntity containing updated FraudRuleDto
     */
    @PutMapping("/rules/{id}")
    public ResponseEntity<FraudRuleDto> updateRule(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRuleRequest request,
            HttpServletRequest httpRequest
    ) {
        String analystEmail = getAuthenticatedEmail();
        String clientIp = ipExtractor.extractClientIp(httpRequest);

        FraudRuleDto updated = analystService.updateRule(id, request, analystEmail, clientIp);
        return ResponseEntity.ok(updated);
    }

    /**
     * Queries immutable administrative and operational compliance audit logs.
     *
     * @param page zero-based page index (default 0)
     * @param size page size (default 20)
     * @param action optional action classification filter
     * @param actorEmail optional actor email substring filter
     * @return ResponseEntity containing PagedResponse of AuditLogDto
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<PagedResponse<AuditLogDto>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actorEmail
    ) {
        return ResponseEntity.ok(analystService.getAuditLogs(page, size, action, actorEmail));
    }

    /**
     * Subscribes a compliance client to live Server-Sent Events (SSE) review streams.
     *
     * @return SseEmitter streaming live transaction events
     */
    @GetMapping(value = "/dashboard/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamDashboard() {
        return analystService.subscribeDashboardStream();
    }

    /**
     * Generates a formal AI Suspicious Activity Report (SAR) narrative for a transaction using Gemini AI.
     *
     * @param id transaction UUID
     * @param httpRequest HTTP servlet request
     * @return ResponseEntity containing created SarReportDto with 201 Created status
     */
    @PostMapping("/transactions/{id}/sar")
    public ResponseEntity<SarReportDto> generateSar(
            @PathVariable String id,
            HttpServletRequest httpRequest
    ) {
        String analystEmail = getAuthenticatedEmail();
        String clientIp = ipExtractor.extractClientIp(httpRequest);

        log.info("Analyst [{}] requested AI SAR generation for transaction [{}]", analystEmail, id);
        SarReportDto created = sarService.generateSar(id, analystEmail, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Retrieves all SAR drafts and filed reports generated for a given transaction.
     *
     * @param id transaction UUID
     * @return ResponseEntity containing List of SarReportDto
     */
    @GetMapping("/transactions/{id}/sar")
    public ResponseEntity<List<SarReportDto>> getSarReports(@PathVariable String id) {
        return ResponseEntity.ok(sarService.getReportsForTransaction(id));
    }

    /**
     * Updates the lifecycle status of an AI SAR report (DRAFT -> FINAL -> FILED).
     *
     * @param sarId SAR report UUID
     * @param request validated status update payload
     * @param httpRequest HTTP servlet request
     * @return ResponseEntity containing updated SarReportDto
     */
    @RequestMapping(value = "/sar/{sarId}/status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<SarReportDto> updateSarStatus(
            @PathVariable String sarId,
            @Valid @RequestBody SarStatusUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        String analystEmail = getAuthenticatedEmail();
        String clientIp = ipExtractor.extractClientIp(httpRequest);

        log.info("Analyst [{}] updating status of SAR [{}] to [{}]", analystEmail, sarId, request.getStatus());
        SarReportDto updated = sarService.updateSarStatus(sarId, request.getStatus(), request.getNotes(), analystEmail, clientIp);
        return ResponseEntity.ok(updated);
    }

    /**
     * Builds and retrieves the interactive fraud syndicate network graph based on seed parameters.
     *
     * @param params search seeds, depth limit, date range, and node threshold
     * @return ResponseEntity containing FraudGraphDto
     */
    @GetMapping("/graph")
    public ResponseEntity<FraudGraphDto> getSyndicateGraph(@Valid GraphQueryParams params) {
        log.info("Analyst [{}] fetching fraud syndicate link graph with params [{}]",
                getAuthenticatedEmail(), params);
        return ResponseEntity.ok(graphDataService.buildGraph(params));
    }

    /**
     * Retrieves the fraud syndicate network graph pre-seeded from a specific transaction's actors.
     *
     * @param id transaction UUID
     * @return ResponseEntity containing FraudGraphDto
     */
    @GetMapping("/graph/transaction/{id}")
    public ResponseEntity<FraudGraphDto> getTransactionGraph(@PathVariable String id) {
        log.info("Analyst [{}] requesting transaction-seeded syndicate graph for txn [{}]",
                getAuthenticatedEmail(), id);

        Transaction txn = transactionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found with ID: " + id));

        GraphQueryParams params = GraphQueryParams.builder()
                .seedUserId(txn.getUserId())
                .seedIpAddress(txn.getIpAddress())
                .seedFingerprint(txn.getDeviceFingerprint())
                .depth(1)
                .maxNodes(80)
                .build();

        return ResponseEntity.ok(graphDataService.buildGraph(params));
    }

    private String getAuthenticatedEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
}
