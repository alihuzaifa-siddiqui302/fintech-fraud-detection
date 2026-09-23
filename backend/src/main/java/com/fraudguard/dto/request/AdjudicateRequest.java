// com.fraudguard.dto.request.AdjudicateRequest
package com.fraudguard.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Compliance analyst adjudication payload to approve or block a flagged transaction.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdjudicateRequest {

    /**
     * Permitted adjudication decisions.
     */
    public enum AdjudicateAction {
        APPROVE,
        BLOCK
    }

    @NotNull(message = "Adjudication decision action (APPROVE or BLOCK) is required")
    private AdjudicateAction action;

    @NotBlank(message = "Resolution notes are required for regulatory auditing")
    @Size(min = 5, message = "Resolution notes must contain at least 5 characters of context")
    private String notes;
}
