package com.zmartcredential.dto.report;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Dashboard + sidebar counter responses. */
public final class BrDashboardDtos {

    private BrDashboardDtos() {
    }

    public record DocCounts(long total, long approved, long missing, long expired, long pendingReview) {
    }

    public record StatCards(
            long totalProviders,
            long activeProviders,
            long providersInCredentialing,
            long activeEnrollments,
            long approvedEnrollments,
            long needsAttentionEnrollments,
            Integer avgTatDays,
            long openTasks,
            long missingDocuments,
            long docsExpiringWithin90Days) {
    }

    public record PayerEnrollmentCount(Long payerId, String payerCode, String payerName, String color,
                                       long approved, long inProgress, long submitted, long total) {
    }

    public record PayerTat(Long payerId, String payerName, String color, Integer avgTatDays, long count,
                           Integer benchmarkTatDays) {
    }

    public record Expiration(Long providerId, String providerName, String docType, String docLabel,
                             LocalDate expiresAt, long daysLeft) {
    }

    public record Summary(
            StatCards stats,
            DocCounts docs,
            Map<String, Long> enrollmentsByStatus,
            List<PayerEnrollmentCount> enrollmentsByPayer,
            List<PayerTat> payerTat,
            long upcomingExpirationsTotal,
            List<Expiration> upcomingExpirations) {
    }

    public record Counters(long openTasks, long unreadNotifications, long outstandingInvoices, long unreadChat) {
    }
}
