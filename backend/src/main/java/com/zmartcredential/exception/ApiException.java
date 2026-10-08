package com.zmartcredential.exception;

import org.springframework.http.HttpStatus;

/** Base class for errors that map to a specific HTTP status with a client-safe message. */
public abstract class ApiException extends RuntimeException {
    private final HttpStatus status;
    /** Optional: the form field the error belongs to (shown under that field). */
    private final java.util.Map<String, String> fieldErrors;

    protected ApiException(HttpStatus status, String message) {
        this(status, message, null);
    }

    protected ApiException(HttpStatus status, String message, java.util.Map<String, String> fieldErrors) {
        super(message);
        this.status = status;
        this.fieldErrors = fieldErrors;
    }

    public java.util.Map<String, String> getFieldErrors() {
        return fieldErrors;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
