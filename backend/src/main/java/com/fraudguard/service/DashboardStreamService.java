// com.fraudguard.service.DashboardStreamService
package com.fraudguard.service;

import com.fraudguard.dto.response.AnalystTransactionDto;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Manages Server-Sent Events (SSE) connections for live compliance dashboard transaction monitoring.
 */
@Slf4j
@Service
public class DashboardStreamService {

    private static final long SSE_TIMEOUT_MS = 30_000L;
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    /**
     * Registers a new SSE client emitter with a 30s timeout and automatic cleanup on error or timeout.
     *
     * @return active SseEmitter instance
     */
    public SseEmitter registerEmitter() {
        String emitterId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);

        emitters.put(emitterId, emitter);
        log.info("Registered SSE dashboard subscriber [{}]. Active listeners: {}", emitterId, emitters.size());

        emitter.onCompletion(() -> {
            emitters.remove(emitterId);
            log.debug("SSE subscriber [{}] connection completed. Active: {}", emitterId, emitters.size());
        });

        emitter.onTimeout(() -> {
            emitters.remove(emitterId);
            log.debug("SSE subscriber [{}] timed out. Active: {}", emitterId, emitters.size());
        });

        emitter.onError(throwable -> {
            emitters.remove(emitterId);
            log.debug("SSE subscriber [{}] encountered error: {}. Active: {}", emitterId, throwable.getMessage(), emitters.size());
        });

        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected to FraudGuard Live Review Stream"));
        } catch (IOException e) {
            log.warn("Failed to dispatch initial SSE heartbeat to emitter [{}]: {}", emitterId, e.getMessage());
            emitters.remove(emitterId);
        }

        return emitter;
    }

    /**
     * Broadcasts a flagged pending review transaction to all actively connected analyst dashboards.
     *
     * @param transaction detailed analyst transaction view
     */
    public void broadcastPendingTransaction(AnalystTransactionDto transaction) {
        if (emitters.isEmpty()) {
            return;
        }

        log.info("Broadcasting pending review transaction [{}] to {} dashboard listeners",
                transaction.id(), emitters.size());

        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("PENDING_TRANSACTION")
                        .data(transaction));
            } catch (Exception ex) {
                log.warn("Error pushing SSE event to emitter [{}], removing listener: {}", id, ex.getMessage());
                emitters.remove(id);
            }
        });
    }

    /**
     * Returns the concurrent map of active SSE emitters.
     *
     * @return map of emitter IDs to SseEmitter instances
     */
    public Map<String, SseEmitter> getEmitters() {
        return emitters;
    }

    /**
     * Removes an emitter by ID.
     *
     * @param emitterId emitter unique identifier
     */
    public void removeEmitter(String emitterId) {
        emitters.remove(emitterId);
    }
}

