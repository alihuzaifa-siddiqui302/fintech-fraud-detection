// com.fraudguard.dto.request.UpdateRuleRequest
package com.fraudguard.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload for recalibrating a fraud detection rule threshold, risk weight, or active status.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRuleRequest {

    @NotNull(message = "Threshold value is required")
    @DecimalMin(value = "0.0", message = "Threshold value cannot be negative")
    private BigDecimal thresholdValue;

    @NotNull(message = "Risk weight is required")
    @Min(value = 0, message = "Risk weight must be between 0 and 100")
    @Max(value = 100, message = "Risk weight must be between 0 and 100")
    private Integer riskWeight;

    @NotNull(message = "Active status flag is required")
    private Boolean isEnabled;
}
