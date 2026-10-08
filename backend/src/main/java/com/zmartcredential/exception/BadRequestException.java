package com.zmartcredential.exception;

import org.springframework.http.HttpStatus;

public class BadRequestException extends ApiException {
    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }

    /** A problem with one form field (shown under that field). */
    public static BadRequestException onField(String field, String message) {
        return new BadRequestException(message, java.util.Map.of(field, message));
    }

    private BadRequestException(String message, java.util.Map<String, String> fieldErrors) {
        super(HttpStatus.BAD_REQUEST, message, fieldErrors);
    }
}
