package com.zmartcredential.dto.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Tasks (TasksView / CreateTaskModal). */
public final class OpsTaskDtos {

    private OpsTaskDtos() {
    }

    public record TaskRow(
            Long id,
            String title,
            String description,
            String priority,
            String status,
            LocalDate dueDate,
            boolean overdue,
            Long providerId,
            String providerName,
            Long assigneeUserId,
            String assigneeName,
            Long createdBy,
            String createdByName,
            LocalDateTime completedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
    }

    public record TaskCounts(long open, long inProgress, long done, long all, long overdue) {
    }

    public record TaskListResponse(List<TaskRow> items, TaskCounts counts) {
    }

    public record TaskRequest(
            @NotBlank(message = "Title is required")
            @Size(max = 255, message = "Title must be at most 255 characters")
            String title,
            @Size(max = 5000, message = "Description must be at most 5000 characters")
            String description,
            @Pattern(regexp = "low|medium|high|urgent", message = "Priority must be low, medium, high or urgent")
            String priority,
            LocalDate dueDate,
            Long providerId,
            Long assigneeUserId) {
    }

    public record TaskStatusRequest(
            @NotBlank(message = "Status is required")
            @Pattern(regexp = "open|in_progress|done", message = "Status must be open, in_progress or done")
            String status) {
    }
}
