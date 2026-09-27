// com.fraudguard.messaging.SseNotificationListener
package com.fraudguard.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.service.DashboardStreamService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Event listener receiving SseNotificationEvent and propagating live notifications to connected analyst clients.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SseNotificationListener {

    private final DashboardStreamService dashboardStreamService;
    private final ObjectMapper objectMapper;

    /**
     * Handles SseNotificationEvent by broadcasting JSON payload to each actively registered SSE emitter.
     *
     * @param event application notification event
     */
    @EventListener
    public void onSseNotification(SseNotificationEvent event) {
        log.info("Received SseNotificationEvent for transaction [{}] score={}",
                event.getTransactionId(), event.getRiskScore());

        Map<String, SseEmitter> emitters = dashboardStreamService.getEmitters();
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        Map<String, Object> payloadMap = Map.of(
                "transactionId", event.getTransactionId(),
                "riskScore", event.getRiskScore(),
                "amount", event.getAmount(),
                "ipCountry", event.getIpCountry() != null ? event.getIpCountry() : "UNKNOWN",
                "status", "PENDING_REVIEW"
        );

        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(payloadMap);
        } catch (Exception ex) {
            log.warn("Failed serializing SSE notification payload: {}", ex.getMessage());
            jsonPayload = "{\"transactionId\":\"" + event.getTransactionId() + "\",\"riskScore\":" + event.getRiskScore() + "}";
        }

        final String finalJson = jsonPayload;
        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("PENDING_TRANSACTION")
                        .data(finalJson));
            } catch (Exception ex) {
                // Silently remove dead or disconnected emitter
                dashboardStreamService.removeEmitter(id);
            }
        });
    }
}
