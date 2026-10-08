package com.zmartcredential.dto.payer;

/**
 * Per-payer statistics for the current organization (PayersView).
 * avgTatComputed=false means payer.avgTatDays (published average) is used as fallback.
 */
public record PayerOverviewItem(
        PayerResponse payer,
        long enrolledProviders,
        long inProgress,
        Integer avgTatDays,
        boolean avgTatComputed,
        boolean orgCredentialSaved) {
}
