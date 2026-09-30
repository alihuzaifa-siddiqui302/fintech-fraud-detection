// com.fraudguard.exception.OtpDeliveryException
package com.fraudguard.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when OTP email transmission encounters a delivery error.
 */
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class OtpDeliveryException extends RuntimeException {

    public OtpDeliveryException(String message) {
        super(message);
    }

    public OtpDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
