package com.zmartcredential.dto.caqh;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** CAQH integration: config, status, sync runs, attestation reminders. */
public final class OpsCaqhDtos {

    private OpsCaqhDtos() {
    }

    public record CaqhConfigResponse(
            String path,
            String directUsername,
            String directOrgId,
            String directEnvironment,
            boolean hasDirectPassword,
            String aggregatorVendor,
            String aggregatorBaseUrl,
            boolean hasAggregatorKey,
            boolean syncEnabled,
            String syncCadence,
            String syncDayOfWeek,
            int syncHour,
            boolean syncOnlyAttested,
            boolean syncNotifyChanges,
            int syncRateLimit,
            LocalDateTime nextRunAt,
            LocalDateTime updatedAt) {
    }

    /** Partial update: every null field is left unchanged. */
    public record CaqhConfigUpdateRequest(
            @Pattern(regexp = "direct|aggregator|csv", message = "Path must be direct, aggregator or csv")
            String path,
            @Size(max = 150, message = "Username must be at most 150 characters")
            String directUsername,
            @Size(max = 200, message = "Password must be at most 200 characters")
            String directPassword,
            @Size(max = 50, message = "Organization ID must be at most 50 characters")
            String directOrgId,
            @Pattern(regexp = "production|sandbox", message = "Environment must be production or sandbox")
            String directEnvironment,
            @Pattern(regexp = "certifyos|andros|verifiable|medallion", message = "Vendor must be certifyos, andros, verifiable or medallion")
            String aggregatorVendor,
            @Size(max = 300, message = "API key must be at most 300 characters")
            String aggregatorApiKey,
            @Size(max = 255, message = "Base URL must be at most 255 characters")
            @Pattern(regexp = "^$|^https://\\S+$", message = "Base URL must start with https://")
            String aggregatorBaseUrl,
            Boolean syncEnabled,
            @Pattern(regexp = "hourly|daily|weekly|monthly", message = "Cadence must be hourly, daily, weekly or monthly")
            String syncCadence,
            @Pattern(regexp = "sunday|monday|tuesday|wednesday|thursday|friday|saturday", message = "Day must be a weekday name (sunday..saturday)")
            String syncDayOfWeek,
            @Min(value = 0, message = "Hour must be between 0 and 23")
            @Max(value = 23, message = "Hour must be between 0 and 23")
            Integer syncHour,
            Boolean syncOnlyAttested,
            Boolean syncNotifyChanges,
            @Min(value = 1, message = "Rate limit must be between 1 and 200")
            @Max(value = 200, message = "Rate limit must be between 1 and 200")
            Integer syncRateLimit) {
    }

    public record CaqhTestResponse(String integration, boolean configured, String path, String message) {
    }

    public record CaqhProviderStatus(
            Long providerId,
            String name,
            String npi,
            String caqhId,
            LocalDate lastAttested,
            LocalDate nextAttestationDue,
            Long daysLeft,
            LocalDateTime lastSynced,
            String attestationStatus,
            String status) {
    }

    public record CaqhStatusStats(long withCaqh, long withoutCaqh, long attestSoon, long overdue, long unknown) {
    }

    public record CaqhStatusResponse(CaqhStatusStats stats, List<CaqhProviderStatus> items) {
    }

    public record CaqhProviderUpdateRequest(
            @Pattern(regexp = "^$|^[A-Za-z0-9-]{1,20}$", message = "CAQH ID must be up to 20 letters or digits")
            String caqhId,
            LocalDate lastAttested,
            @Size(max = 30, message = "Attestation status must be at most 30 characters")
            String attestationStatus) {
    }

    public record SyncRunItem(Long id, String triggerType, String status, int providersChecked, int providersUpdated,
                              List<String> changes, int durationSec, LocalDateTime startedAt) {
    }

    public record SyncRunRequest(Long providerId) {
    }

    public record SyncDeferredResponse(String integration, String message, Long providerId) {
    }

    public record AttestationItem(
            Long providerId,
            String name,
            String email,
            String caqhId,
            LocalDate lastAttested,
            LocalDate dueDate,
            long daysUntilDue,
            String status) {
    }

    public record AttestationStats(long expired, long urgent, long warning, long upcoming, long missingAttestationDate) {
    }

    public record AttestationsResponse(AttestationStats stats, List<AttestationItem> items) {
    }

    public record RuleItem(Long id, String name, int daysBefore, String channel, String template, boolean enabled,
                           LocalDateTime lastTriggeredAt, int sentCount) {
    }

    public record RuleRequest(
            @NotBlank(message = "Rule name is required")
            @Size(max = 100, message = "Rule name must be at most 100 characters")
            String name,
            @NotNull(message = "Days before due is required")
            @Min(value = -90, message = "Days must be between -90 and 365")
            @Max(value = 365, message = "Days must be between -90 and 365")
            Integer daysBefore,
            @NotBlank(message = "Channel is required")
            @Pattern(regexp = "email|email\\+sms|email\\+sms\\+call|email\\+manager", message = "Channel must be email, email+sms, email+sms+call or email+manager")
            String channel,
            @NotBlank(message = "Template is required")
            @Pattern(regexp = "friendly|standard|urgent|final|escalation", message = "Template must be friendly, standard, urgent, final or escalation")
            String template,
            Boolean enabled) {
    }

    public record RuleEnabledRequest(@NotNull(message = "enabled is required") Boolean enabled) {
    }

    public record RuleMatch(Long ruleId, String ruleName, Long providerId, String providerName, long daysLeft,
                            LocalDate dueDate, String channel, String template, boolean alreadySent) {
    }

    /** remindersQueued = reminders logged; integration: "smtp", or "deferred" when email sending is off. */
    public record RuleRunResponse(boolean dryRun, int rulesEvaluated, int remindersQueued, List<RuleMatch> matches,
                                  String integration, int remindersSent, int remindersFailed) {
    }

    public record SendReminderRequest(
            @NotNull(message = "Provider is required") Long providerId,
            @NotBlank(message = "Template is required")
            @Pattern(regexp = "friendly|standard|urgent|final|escalation", message = "Template must be friendly, standard, urgent, final or escalation")
            String template,
            @NotBlank(message = "Channel is required")
            @Pattern(regexp = "email|email\\+sms|email\\+sms\\+call|email\\+manager", message = "Channel must be email, email+sms, email+sms+call or email+manager")
            String channel) {
    }

    public record ReminderLogItem(Long id, Long ruleId, String ruleName, Long providerId, String providerName,
                                  String channel, String template, LocalDate dueDate, String status,
                                  String triggeredBy, LocalDateTime sentAt) {
    }
}
