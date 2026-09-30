// com.fraudguard.dto.request.GraphQueryParams
package com.fraudguard.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * Filter parameters for querying and building the fraud syndicate link graph.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GraphQueryParams {

    private String seedUserId;
    private String seedIpAddress;
    private String seedFingerprint;

    @Min(1)
    @Max(2)
    @Builder.Default
    private int depth = 1;

    @Min(10)
    @Max(150)
    @Builder.Default
    private int maxNodes = 80;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private String fromDate;
}
