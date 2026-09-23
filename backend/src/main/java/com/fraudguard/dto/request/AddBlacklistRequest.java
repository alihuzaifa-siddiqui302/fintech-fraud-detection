// com.fraudguard.dto.request.AddBlacklistRequest
package com.fraudguard.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload for adding a new entry to the global blacklist.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddBlacklistRequest {

    @NotBlank(message = "Blacklist target type is mandatory (IP, DEVICE, EMAIL, FINGERPRINT)")
    private String targetType;

    @NotBlank(message = "Blacklist target value is mandatory")
    private String targetValue;

    @NotBlank(message = "Reason for blacklisting is required")
    @Size(min = 5, message = "Reason must provide at least 5 characters of context")
    private String reason;
}
