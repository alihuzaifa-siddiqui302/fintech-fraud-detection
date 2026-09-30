package com.fraudguard.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when Gemini AI report generation encounters an error, rate limit, timeout, or configuration issue.
 */
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class SarGenerationException extends RuntimeException {

    public SarGenerationException(String message) {
        super(message);
    }

    public SarGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
