package com.fraudguard.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Custom API exception for domain constraint violations and invalid transitions.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(int statusCode, String message) {
        super(message);
        this.status = HttpStatus.valueOf(statusCode);
    }

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
