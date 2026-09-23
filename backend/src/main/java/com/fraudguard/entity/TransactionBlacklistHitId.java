// com.fraudguard.entity.TransactionBlacklistHitId
package com.fraudguard.entity;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Composite identifier class for TransactionBlacklistHit entity.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionBlacklistHitId implements Serializable {

    private String transactionId;
    private Long blacklistId;
}
