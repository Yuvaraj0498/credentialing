package com.zmartcredential.dto.enrollment;

import java.time.LocalDate;
import java.util.List;

public record RecredScheduleResponse(LocalDate today, String window, Counts counts, List<Item> items) {

    /** Tier-exclusive counts; all = every tracked approved enrollment including future. */
    public record Counts(long all, long overdue, long due30, long due60, long due90, long future) {
    }

    public record Item(
            Long enrollmentId,
            Long providerId,
            String providerName,
            String providerNpi,
            Long payerId,
            String payerName,
            String payerColor,
            LocalDate effectiveDate,
            int cycleMonths,
            LocalDate dueDate,
            long daysUntil,
            String bucket,
            Long openRecredEnrollmentId) {
    }
}
