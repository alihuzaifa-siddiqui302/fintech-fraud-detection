// com.fraudguard.messaging.TransactionEventConsumer
package com.fraudguard.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.constant.AppConstants;
import com.fraudguard.messaging.event.TransactionKafkaEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Kafka stream consumer ingesting submitted transactions and dispatching alerts to analyst workbenches.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TransactionEventConsumer {

    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Ingests evaluated transactions from the Kafka raw topic and propagates pending review alerts via ApplicationEvent.
     *
     * @param record Kafka consumer record
     * @param ack manual acknowledgment handle
     */
    @KafkaListener(
            topics = AppConstants.KafkaTopics.TXN_RAW,
            groupId = "fraudguard-main",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onTransactionSubmitted(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            TransactionKafkaEvent event = objectMapper.readValue(record.value(), TransactionKafkaEvent.class);

            if (AppConstants.TransactionStatus.PENDING_REVIEW.equalsIgnoreCase(event.status())) {
                log.info("Transaction [{}] in PENDING_REVIEW status. Publishing SseNotificationEvent.", event.transactionId());
                eventPublisher.publishEvent(new SseNotificationEvent(
                        this,
                        event.transactionId(),
                        event.riskScore(),
                        event.amount(),
                        event.ipCountry()
                ));
            } else if (AppConstants.TransactionStatus.BLOCKED.equalsIgnoreCase(event.status())) {
                log.warn("Transaction {} auto-blocked score={} user={}",
                        event.transactionId(), event.riskScore(), event.userId());
            }

            if (ack != null) {
                ack.acknowledge();
            }
        } catch (Exception ex) {
            log.error("Failed to process transaction streaming record on key [{}]: {}. Acknowledging to avoid partition poisoning.",
                    record.key(), ex.getMessage(), ex);
            if (ack != null) {
                ack.acknowledge();
            }
        }
    }
}
