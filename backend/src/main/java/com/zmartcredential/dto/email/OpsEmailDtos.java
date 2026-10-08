package com.zmartcredential.dto.email;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Email reminders (EmailRemindersView / Wizard / PreviewModal). */
public final class OpsEmailDtos {

    private OpsEmailDtos() {
    }

    public record ReminderRow(
            Long providerId,
            String name,
            String email,
            Long locationId,
            String locationName,
            String providerStatus,
            int missing,
            int total,
            int missingCritical,
            int expiringSoon,
            String status,
            String statusLabel,
            LocalDateTime lastSentAt,
            Long scheduleId,
            String cadence) {
    }

    public record ReminderCounts(long all, long missing, long active, long complete) {
    }

    public record ReminderListResponse(List<ReminderRow> items, ReminderCounts counts) {
    }

    public record TemplateItem(Long id, String type, String name, String subject, String body, boolean system,
                               List<String> variables) {
    }

    public record PreviewRequest(Long providerId) {
    }

    public record PreviewResponse(String subject, String body, Long providerId, String toEmail) {
    }

    public record ScheduleProvider(Long id, String name, String email) {
    }

    public record ScheduleItem(
            Long id,
            String reminderType,
            Long templateId,
            String templateName,
            String cadence,
            boolean active,
            LocalDateTime nextRunAt,
            LocalDateTime lastSentAt,
            LocalDateTime createdAt,
            int providerCount,
            List<ScheduleProvider> providers) {
    }

    public record ScheduleRequest(
            @NotBlank(message = "Choose what to remind about")
            @Pattern(regexp = "missing_docs|expiring|incomplete", message = "Reminder type must be missing_docs, expiring or incomplete")
            String reminderType,
            Long templateId,
            @NotBlank(message = "Choose a cadence")
            @Pattern(regexp = "daily|weekly|biweekly|monthly", message = "Cadence must be daily, weekly, biweekly or monthly")
            String cadence,
            @NotEmpty(message = "Select at least one provider")
            List<Long> providerIds) {
    }

    public record ScheduleActiveRequest(@NotNull(message = "active is required") Boolean active) {
    }

    /** queued = reminders processed (sent, failed or only recorded); integration: "smtp", or "deferred" when sending is off. */
    public record SendNowResponse(int queued, int skipped, String integration, String message, int sent, int failed) {
    }

    public record EmailLogItem(
            Long id,
            Long providerId,
            String providerName,
            Long scheduleId,
            String toEmail,
            String subject,
            String status,
            LocalDateTime createdAt) {
    }

    /** Used internally for template variables. */
    public record DocLine(String label, LocalDate expiresAt) {
    }
}
