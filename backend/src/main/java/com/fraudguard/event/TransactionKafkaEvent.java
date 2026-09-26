// com.fraudguard.event.TransactionKafkaEvent
package com.fraudguard.event;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Event payload broadcast to Apache Kafka during transaction evaluation and adjudication stages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionKafkaEvent {

    private String eventType;
    private String transactionId;
    private String userId;
    private BigDecimal amount;
    private String currency;
    private String ipAddress;
    private String ipCountry;
    private int riskScore;
    private String status;
    private List<String> triggeredRuleCodes;
    private String reviewedBy;
    private String resolutionNotes;
    private OffsetDateTime timestamp;
}
