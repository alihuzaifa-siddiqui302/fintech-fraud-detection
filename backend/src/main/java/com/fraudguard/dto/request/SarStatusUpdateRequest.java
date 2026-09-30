// com.fraudguard.dto.request.SarStatusUpdateRequest
package com.fraudguard.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for transitioning SAR status (FINAL or FILED).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SarStatusUpdateRequest {

    @NotBlank(message = "Status cannot be blank")
    private String status;

    private String notes;
}
