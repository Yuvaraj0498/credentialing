package com.zmartcredential.exception;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors,
        Instant timestamp,
        String path) {
}
