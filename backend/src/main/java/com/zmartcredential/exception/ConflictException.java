package com.zmartcredential.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends ApiException {
    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }

    /** A conflict on one form field, e.g. ("email", "This email is already used…"). */
    public static ConflictException onField(String field, String message) {
        return new ConflictException(message, java.util.Map.of(field, message));
    }

    private ConflictException(String message, java.util.Map<String, String> fieldErrors) {
        super(HttpStatus.CONFLICT, message, fieldErrors);
    }
}
