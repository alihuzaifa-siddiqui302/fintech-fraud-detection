// com.fraudguard.exception.InvalidTokenException
package com.fraudguard.exception;

/**
 * Exception thrown when an inbound JWT token is malformed, expired, or cryptographically invalid.
 */
public class InvalidTokenException extends RuntimeException {

    /**
     * Constructs a new InvalidTokenException with descriptive diagnostic message.
     *
     * @param message failure description
     */
    public InvalidTokenException(String message) {
        super(message);
    }

    /**
     * Constructs a new InvalidTokenException with message and root cause exception.
     *
     * @param message failure description
     * @param cause underlying cause
     */
    public InvalidTokenException(String message, Throwable cause) {
        super(message, cause);
    }
}
