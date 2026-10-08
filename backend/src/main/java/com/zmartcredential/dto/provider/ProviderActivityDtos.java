package com.zmartcredential.dto.provider;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class ProviderActivityDtos {

    private ProviderActivityDtos() {
    }

    public record TimeEntryRequest(
            @NotNull(message = "Start time is required") LocalDateTime startedAt,
            LocalDateTime endedAt,
            @PositiveOrZero(message = "Duration cannot be negative") Integer seconds,
            @Size(max = 1000, message = "At most 1000 characters") String note) {
    }

    public record TimeEntryResponse(Long id, Long providerId, Long userId, String userName,
                                    LocalDateTime startedAt, LocalDateTime endedAt, int seconds, String note,
                                    LocalDateTime createdAt) {
    }

    public record FollowUpRequest(
            @NotBlank(message = "Type is required")
            @Pattern(regexp = "phone_call|email|meeting|note", message = "Type must be phone_call, email, meeting or note")
            String type,
            @NotBlank(message = "Subject is required") @Size(max = 255, message = "At most 255 characters") String subject,
            @Size(max = 5000, message = "At most 5000 characters") String outcome,
            LocalDateTime occurredAt,
            LocalDate nextDate) {
    }

    public record FollowUpTask(Long id, String title, LocalDate dueDate, String status, String priority) {
    }

    /** task is only set in the POST response when nextDate created a follow-up task. */
    public record FollowUpResponse(Long id, Long providerId, Long userId, String userName, String type,
                                   String subject, String outcome, LocalDateTime occurredAt, LocalDate nextDate,
                                   LocalDateTime createdAt, FollowUpTask task) {
    }
}
