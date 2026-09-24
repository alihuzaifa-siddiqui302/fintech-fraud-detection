// com.fraudguard.dto.response.ErrorResponse
package com.fraudguard.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

/**
 * Standardized RFC-7807 compliant error response payload returned by API endpoints.
 *
 * @param error error type classification
 * @param message human-readable diagnostic description
 * @param status HTTP response status code
 * @param timestamp error occurrence instant
 * @param path request URI path that produced the error
 * @param validationErrors optional field-level validation constraint violations
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
    String error,
    String message,
    int status,
    Instant timestamp,
    String path,
    Map<String, String> validationErrors
) {
    /**
     * Compact constructor omitting field validation errors.
     *
     * @param error error category
     * @param message descriptive message
     * @param status HTTP status code
     * @param timestamp occurrence timestamp
     * @param path request path
     */
    public ErrorResponse(String error, String message, int status, Instant timestamp, String path) {
        this(error, message, status, timestamp, path, null);
    }
}
