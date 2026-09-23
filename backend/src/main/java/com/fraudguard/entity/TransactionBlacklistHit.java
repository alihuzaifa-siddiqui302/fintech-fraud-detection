// com.fraudguard.entity.TransactionBlacklistHit
package com.fraudguard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Join entity linking a blocked transaction to the specific blacklist entry that caused the block.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "transaction_blacklist_hits")
@IdClass(TransactionBlacklistHitId.class)
public class TransactionBlacklistHit {

    @Id
    @Column(name = "transaction_id", columnDefinition = "uuid", nullable = false)
    private String transactionId;

    @Id
    @Column(name = "blacklist_id", nullable = false)
    private Long blacklistId;
}
