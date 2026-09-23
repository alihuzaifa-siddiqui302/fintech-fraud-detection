// com.fraudguard.entity.IpIntelligence
package com.fraudguard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Represents cached intelligence and risk reputation metadata for an evaluated IP address.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ip_intelligence")
public class IpIntelligence {

    @Id
    @Column(name = "ip_address", length = 45, nullable = false)
    private String ipAddress;

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(name = "country_name", length = 100)
    private String countryName;

    @Column(length = 100)
    private String city;

    @Column
    private String isp;

    @Column
    private String org;

    @Column(name = "is_vpn")
    private Boolean isVpn;

    @Column(name = "is_tor")
    private Boolean isTor;

    @Column(name = "is_proxy")
    private Boolean isProxy;

    @Column(name = "is_hosting_ip")
    private Boolean isHostingIp;

    @Column(name = "ipqs_fraud_score")
    private Integer ipqsFraudScore;

    @Column(name = "raw_response", columnDefinition = "jsonb")
    private String rawResponse;

    @CreationTimestamp
    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;
}
