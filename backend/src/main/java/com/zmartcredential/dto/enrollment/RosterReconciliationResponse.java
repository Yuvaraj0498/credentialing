package com.zmartcredential.dto.enrollment;

import java.time.LocalDateTime;
import java.util.List;

public record RosterReconciliationResponse(
        Long payerId,
        String payerName,
        String payerColor,
        Long uploadId,
        String fileName,
        Integer rowCount,
        LocalDateTime uploadedAt,
        int ourApprovedCount,
        List<Matched> matched,
        List<Missing> missingFromPayer,
        List<NotOurs> notOurs,
        String integration,
        String message) {

    public record Matched(Long providerId, String providerName, String npi, String specialty, Long enrollmentId, Long entryId) {
    }

    public record Missing(Long providerId, String providerName, String npi, String specialty, Long enrollmentId) {
    }

    /** reason: not_our_provider | not_approved */
    public record NotOurs(Long entryId, String npi, String firstName, String lastName, String specialty,
                          String actionStatus, Long providerId, String reason) {
    }
}
