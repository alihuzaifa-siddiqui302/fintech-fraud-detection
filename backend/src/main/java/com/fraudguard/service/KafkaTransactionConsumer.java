// com.fraudguard.service.KafkaTransactionConsumer
package com.fraudguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.dto.response.AnalystTransactionDto;
import com.fraudguard.entity.SessionSignal;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.TransactionRuleHit;
import com.fraudguard.entity.User;
import com.fraudguard.event.TransactionKafkaEvent;
import com.fraudguard.repository.SessionSignalRepository;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.TransactionRuleHitRepository;
import com.fraudguard.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

/**
 * Consumes raw transaction stream events from Kafka and broadcasts pending reviews to active analyst SSE clients.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaTransactionConsumer {

    private final ObjectMapper objectMapper;
    private final DashboardStreamService dashboardStreamService;
    private final TransactionRepository transactionRepository;
    private final TransactionRuleHitRepository transactionRuleHitRepository;
    private final SessionSignalRepository sessionSignalRepository;
    private final UserRepository userRepository;
    private final MapperService mapperService;

    /**
     * Consumes evaluated transaction events and propagates pending review alerts to SSE subscribers.
     *
     * @param message serialized Kafka message string
     */
    @KafkaListener(
            topics = AppConstants.KafkaTopics.TXN_RAW,
            groupId = "fraudguard-main",
            autoStartup = "${fraudguard.kafka.consumer.auto-start:true}"
    )
    public void consumeTransactionEvent(String message) {
        try {
            TransactionKafkaEvent event = objectMapper.readValue(message, TransactionKafkaEvent.class);
            if (AppConstants.TransactionStatus.PENDING_REVIEW.equalsIgnoreCase(event.getStatus())) {
                transactionRepository.findById(event.getTransactionId()).ifPresent(txn -> {
                    List<TransactionRuleHit> ruleHits = transactionRuleHitRepository.findByTransactionId(txn.getId());
                    SessionSignal sessionSignal = sessionSignalRepository.findByTransactionId(txn.getId()).orElse(null);
                    User reviewer = (txn.getReviewedBy() != null)
                            ? userRepository.findById(txn.getReviewedBy()).orElse(null)
                            : null;
                    AnalystTransactionDto dto = mapperService.toAnalystDto(txn, ruleHits, reviewer, sessionSignal);
                    dashboardStreamService.broadcastPendingTransaction(dto);
                });
            }
        } catch (Exception ex) {
            log.warn("Error processing Kafka transaction streaming event: {}", ex.getMessage());
        }
    }
}
