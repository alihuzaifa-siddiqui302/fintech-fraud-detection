// com.fraudguard.exception.GlobalExceptionHandler
package com.fraudguard.exception;

import com.fraudguard.dto.response.ErrorResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Centralized exception translation advising all REST controllers to return structured ErrorResponse JSON.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles missing database entities (404 NOT_FOUND).
     *
     * @param exception EntityNotFoundException
     * @param request HTTP request
     * @return ResponseEntity containing ErrorResponse
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(
            EntityNotFoundException exception,
            HttpServletRequest request
    ) {
        log.warn("Entity not found: {} on path: {}", exception.getMessage(), request.getRequestURI());
        ErrorResponse errorResponse = new ErrorResponse(
                "NOT_FOUND",
                exception.getMessage(),
                HttpStatus.NOT_FOUND.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException exception,
            HttpServletRequest request
    ) {
        log.warn("Resource not found: {} on path: {}", exception.getMessage(), request.getRequestURI());
        ErrorResponse errorResponse = new ErrorResponse(
                "NOT_FOUND",
                exception.getMessage(),
                HttpStatus.NOT_FOUND.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(
            ApiException exception,
            HttpServletRequest request
    ) {
        log.warn("API Exception ({}): {} on path: {}", exception.getStatus(), exception.getMessage(), request.getRequestURI());
        ErrorResponse errorResponse = new ErrorResponse(
                exception.getStatus().name(),
                exception.getMessage(),
                exception.getStatus().value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(exception.getStatus()).body(errorResponse);
    }

    @ExceptionHandler(SarGenerationException.class)
    public ResponseEntity<ErrorResponse> handleSarGenerationException(
            SarGenerationException exception,
            HttpServletRequest request
    ) {
        log.warn("SAR Generation Error: {} on path: {}", exception.getMessage(), request.getRequestURI());
        ErrorResponse errorResponse = new ErrorResponse(
                "SAR_GENERATION_FAILED",
                exception.getMessage(),
                HttpStatus.BAD_GATEWAY.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(errorResponse);
    }

    /**
     * Handles unauthorized access violations (403 FORBIDDEN).
     *
     * @param exception AccessDeniedException
     * @param request HTTP request
     * @return ResponseEntity containing ErrorResponse
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException exception,
            HttpServletRequest request
    ) {
        log.warn("Access denied for request to: {}: {}", request.getRequestURI(), exception.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                "FORBIDDEN",
                "Access is denied: insufficient role privileges",
                HttpStatus.FORBIDDEN.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    /**
     * Handles authentication failures (401 UNAUTHORIZED).
     *
     * @param exception AuthenticationException
     * @param request HTTP request
     * @return ResponseEntity containing ErrorResponse
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationException exception,
            HttpServletRequest request
    ) {
        log.warn("Authentication failed on path: {}: {}", request.getRequestURI(), exception.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                "UNAUTHORIZED",
                exception.getMessage(),
                HttpStatus.UNAUTHORIZED.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * Handles invalid or expired JWT token exceptions (401 UNAUTHORIZED).
     *
     * @param exception InvalidTokenException
     * @param request HTTP request
     * @return ResponseEntity containing ErrorResponse
     */
    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidTokenException(
            InvalidTokenException exception,
            HttpServletRequest request
    ) {
        log.warn("Invalid JWT token presented on path: {}: {}", request.getRequestURI(), exception.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                "UNAUTHORIZED",
                exception.getMessage(),
                HttpStatus.UNAUTHORIZED.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * Handles request body constraint and validation failures (400 BAD_REQUEST).
     *
     * @param exception MethodArgumentNotValidException
     * @param request HTTP request
     * @return ResponseEntity containing ErrorResponse with field details
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        log.warn("Validation failed on path: {} with errors: {}", request.getRequestURI(), fieldErrors);
        ErrorResponse errorResponse = new ErrorResponse(
                "VALIDATION_FAILED",
                "Input validation constraint violations occurred",
                HttpStatus.BAD_REQUEST.value(),
                Instant.now(),
                request.getRequestURI(),
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Handles database unique constraint violations or integrity errors (409 CONFLICT).
     *
     * @param exception DataIntegrityViolationException
     * @param request HTTP request
     * @return ResponseEntity containing ErrorResponse
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException exception,
            HttpServletRequest request
    ) {
        log.warn("Data integrity conflict on path: {}: {}", request.getRequestURI(), exception.getMessage());
        String message = "A conflicting record already exists in the system";
        if ("DELETE".equalsIgnoreCase(request.getMethod())) {
            message = "Cannot delete record because related records still reference it";
        }
        ErrorResponse errorResponse = new ErrorResponse(
                "CONFLICT",
                message,
                HttpStatus.CONFLICT.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    /**
     * Handles illegal argument exceptions (400 BAD_REQUEST).
     *
     * @param exception IllegalArgumentException
     * @param request HTTP request
     * @return ResponseEntity containing ErrorResponse
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException exception,
            HttpServletRequest request
    ) {
        log.warn("Illegal argument supplied on path: {}: {}", request.getRequestURI(), exception.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                "BAD_REQUEST",
                exception.getMessage(),
                HttpStatus.BAD_REQUEST.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Fallback handler for all unexpected unhandled server exceptions (500 INTERNAL_SERVER_ERROR).
     *
     * @param exception unexpected Exception
     * @param request HTTP request
     * @return ResponseEntity containing generic ErrorResponse
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error("Unhandled server exception caught on path: {}", request.getRequestURI(), exception);
        ErrorResponse errorResponse = new ErrorResponse(
                "INTERNAL_SERVER_ERROR",
                "An unexpected internal error occurred. Please contact compliance support.",
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                Instant.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
