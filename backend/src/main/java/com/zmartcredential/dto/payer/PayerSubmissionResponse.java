package com.zmartcredential.dto.payer;

import java.time.LocalDateTime;

public record PayerSubmissionResponse(
        Long id,
        Long providerId,
        String providerName,
        Long payerId,
        String payerName,
        String payerColor,
        Long enrollmentId,
        String method,
        String status,
        String confirmationNumber,
        String message,
        Integer documentCount,
        Long submittedBy,
        String submittedByName,
        LocalDateTime submittedAt) {
}
