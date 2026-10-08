package com.zmartcredential.dto.credentialing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Credentialing hub: hospitals, privileges, expiration alerts, sanctions monitoring. */
public final class OpsHubDtos {

    private OpsHubDtos() {
    }

    // ---------- Hospitals ----------
    public record HospitalItem(Long id, String name, String city, String state, boolean active) {
    }

    public record HospitalRequest(
            @NotBlank(message = "Hospital name is required")
            @Size(max = 200, message = "Name must be at most 200 characters")
            String name,
            @Size(max = 100, message = "City must be at most 100 characters")
            String city,
            @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "State must be a 2-letter code")
            String state,
            Boolean active) {
    }

    // ---------- Privileges ----------
    public record PrivilegeItemStatus(Long privilegeItemId, String name, int sortOrder, String status,
                                      LocalDate requestedAt, LocalDate decidedAt) {
    }

    public record ProviderPrivilegesResponse(
            Long providerId,
            String providerName,
            String specialty,
            Long hospitalId,
            String hospitalName,
            String categoryCode,
            String categoryName,
            List<PrivilegeItemStatus> items) {
    }

    public record PrivilegeUpsertRequest(
            @NotNull(message = "Provider is required") Long providerId,
            @NotNull(message = "Hospital is required") Long hospitalId,
            @NotNull(message = "Privilege is required") Long privilegeItemId,
            @NotBlank(message = "Status is required")
            @Pattern(regexp = "none|requested|pending|granted|denied", message = "Status must be none, requested, pending, granted or denied")
            String status) {
    }

    public record PrivilegeSummaryRow(Long providerId, String providerName, Long hospitalId, String hospitalName,
                                      long requested, long pending, long granted, long denied, long total) {
    }

    // ---------- Expiration alerts ----------
    public record ExpirationAlertSettings(
            @NotNull(message = "enabled is required") Boolean enabled,
            @NotNull(message = "Critical threshold is required")
            @Min(value = 1, message = "Critical threshold must be between 1 and 30 days")
            @Max(value = 30, message = "Critical threshold must be between 1 and 30 days")
            Integer criticalDays,
            @NotNull(message = "Warning threshold is required")
            @Min(value = 1, message = "Warning threshold must be between 1 and 90 days")
            @Max(value = 90, message = "Warning threshold must be between 1 and 90 days")
            Integer warningDays,
            @NotNull(message = "Heads-up threshold is required")
            @Min(value = 30, message = "Heads-up threshold must be between 30 and 180 days")
            @Max(value = 180, message = "Heads-up threshold must be between 30 and 180 days")
            Integer infoDays,
            @NotNull(message = "notifyEmail is required") Boolean notifyEmail,
            @NotNull(message = "notifyDashboard is required") Boolean notifyDashboard,
            @NotBlank(message = "Cadence is required")
            @Pattern(regexp = "daily|weekly|hourly", message = "Cadence must be daily, weekly or hourly")
            String cadence,
            @NotNull(message = "docTypes is required") List<String> docTypes) {
    }

    public record ExpirationStats(long expired, long critical, long warning, long info) {
    }

    public record ExpirationItem(Long providerId, String providerName, String providerEmail, String docType,
                                 String docLabel, LocalDate expiresAt, long daysLeft, String tier, String source) {
    }

    public record ExpirationAlertsResponse(boolean enabled, ExpirationAlertSettings settings, ExpirationStats stats,
                                           List<ExpirationItem> items) {
    }

    public record ExpirationNotifyRequest(
            @NotNull(message = "Provider is required") Long providerId,
            @NotBlank(message = "Document type is required") String docType) {
    }

    public record QueuedResponse(int queued, String integration, String message) {
    }

    // ---------- Sanctions ----------
    public record SourceCheck(String status, String message, LocalDateTime checkedAt) {
    }

    public record SanctionsRow(
            Long providerId,
            String name,
            String npi,
            Map<String, SourceCheck> checks,
            LocalDateTime lastChecked,
            LocalDate nextDue,
            Long daysUntilDue,
            String status,
            boolean dueSoon,
            boolean overdue,
            List<String> flags) {
    }

    public record SanctionsStats(long total, long clear, long flagged, long never, long dueSoon, long overdue) {
    }

    public record SanctionsResponse(int intervalDays, SanctionsStats stats, List<SanctionsRow> items) {
    }

    public record DeferredResponse(String integration, String message) {
    }
}
