// com.fraudguard.config.KafkaTopicConfig
package com.fraudguard.config;

import com.fraudguard.constant.AppConstants;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Declarative configuration defining Kafka topics, partitioning topologies, and dead-letter queues.
 */
@Configuration
public class KafkaTopicConfig {

    /**
     * Raw inbound evaluated transactions topic partitioned for concurrent analysis.
     */
    @Bean
    public NewTopic rawTransactionTopic() {
        return TopicBuilder.name(AppConstants.KafkaTopics.TXN_RAW)
                .partitions(3)
                .replicas(1)
                .build();
    }

    /**
     * Final adjudicated transaction decisions topic.
     */
    @Bean
    public NewTopic decidedTransactionTopic() {
        return TopicBuilder.name(AppConstants.KafkaTopics.TXN_DECIDED)
                .partitions(3)
                .replicas(1)
                .build();
    }

    /**
     * Immutable administrative compliance audit trail replication topic.
     */
    @Bean
    public NewTopic auditEventsTopic() {
        return TopicBuilder.name(AppConstants.KafkaTopics.AUDIT_EVENTS)
                .partitions(1)
                .replicas(1)
                .build();
    }

    /**
     * Dead-letter queue topic capturing poisoned raw transaction messages.
     */
    @Bean
    public NewTopic rawTransactionDltTopic() {
        return TopicBuilder.name(AppConstants.KafkaTopics.TXN_RAW_DLT)
                .partitions(1)
                .replicas(1)
                .build();
    }

    /**
     * Dead-letter queue topic capturing unparseable or poisoned compliance audit messages.
     */
    @Bean
    public NewTopic auditEventsDltTopic() {
        return TopicBuilder.name(AppConstants.KafkaTopics.AUDIT_EVENTS_DLT)
                .partitions(1)
                .replicas(1)
                .build();
    }
}
