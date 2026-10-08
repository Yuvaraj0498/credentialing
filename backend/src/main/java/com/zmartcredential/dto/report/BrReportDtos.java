package com.zmartcredential.dto.report;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** ReportsView responses. */
public final class BrReportDtos {

    private BrReportDtos() {
    }

    // ----- provider credentialing -----
    public record ExpirationBuckets(long expired, long lt30, long d30to60, long d61to90) {
    }

    public record DocCollection(String docType, String label, boolean critical, long approved, long total, int percent) {
    }

    public record TatPoint(String month, String label, Integer avgTatDays, long count) {
    }

    public record ProviderProgressRow(Long providerId, String name, String specialty, String status, String statusKey,
                                      long docsApproved, long docsTotal, long docsMissing, long docsExpired,
                                      long docsPendingReview, int percent) {
    }

    public record ProviderCredentialing(
            long totalProviders,
            Map<String, Long> providersByStatus,
            long totalMissing,
            ExpirationBuckets expirationBuckets,
            Integer avgTatDays,
            long completedCount,
            long inProgressCount,
            List<TatPoint> tatTrend,
            List<DocCollection> collectionByDocType,
            List<ProviderProgressRow> providers) {
    }

    // ----- roster -----
    public record RosterRow(Long providerId, String firstName, String lastName, String suffix, String name,
                            String specialty, String status, String statusKey, long docsApproved, long docsTotal,
                            String email, String npi, String caqhId, Long locationId, String locationName,
                            Long practiceId, String practiceName, String licenseNumber, String licenseState,
                            LocalDate licenseExpires, LocalDate deaExpires, LocalDate dateAdded) {
    }

    // ----- document status grid / checklist -----
    public record DocTypeRef(String docType, String label, boolean critical) {
    }

    public record DocStatusTotals(long approved, long missing, long expired, long pendingReview, long na) {
    }

    public record DocTypeApproved(String docType, String label, long approved, long total) {
    }

    public record ProviderDocRow(Long providerId, String name, Map<String, String> statuses) {
    }

    public record DocumentStatus(DocStatusTotals totals, List<DocTypeApproved> byDocType, List<DocTypeRef> docTypes,
                                 List<ProviderDocRow> providers) {
    }

    // ----- payer enrollment -----
    public record PayerRow(Long payerId, String payerCode, String payerName, String color, long total, long draft,
                           long inProgress, long submitted, long approved, long needsAttention, long onHold,
                           long terminated, Integer avgTatDays, Integer benchmarkTatDays) {
    }

    public record MonthPoint(String month, String label, long submitted, long approved) {
    }

    public record PayerEnrollment(long total, Map<String, Long> byStatus, long inProgress, long submitted,
                                  long approved, long needsAttention, Integer avgTatDays, long tatSampleSize,
                                  List<PayerRow> byPayer, List<MonthPoint> monthlyTrend) {
    }

    // ----- reappointments -----
    public record ReappointmentRow(Long providerId, String name, String specialty, LocalDate lastCredentialed,
                                   LocalDate nextReappointment, Long daysLeft, String status, String statusLabel) {
    }

    public record Reappointments(long overdue, long dueSoon, long current, long notScheduled,
                                 List<ReappointmentRow> rows) {
    }
}
