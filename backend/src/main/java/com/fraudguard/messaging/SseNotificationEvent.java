// com.fraudguard.messaging.SseNotificationEvent
package com.fraudguard.messaging;

import java.math.BigDecimal;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Internal Spring application event signaling that a transaction has been flagged for compliance review.
 */
@Getter
public class SseNotificationEvent extends ApplicationEvent {

    private final String transactionId;
    private final int riskScore;
    private final BigDecimal amount;
    private final String ipCountry;

    /**
     * Constructs a new SseNotificationEvent.
     *
     * @param source the object on which the event initially occurred
     * @param transactionId unique transaction identifier
     * @param riskScore composite risk score
     * @param amount monetary value
     * @param ipCountry originating country code
     */
    public SseNotificationEvent(Object source, String transactionId, int riskScore, BigDecimal amount, String ipCountry) {
        super(source);
        this.transactionId = transactionId;
        this.riskScore = riskScore;
        this.amount = amount;
        this.ipCountry = ipCountry;
    }
}
