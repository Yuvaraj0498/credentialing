package com.zmartcredential.service;

import com.zmartcredential.dto.task.OpsTaskDtos.TaskCounts;
import com.zmartcredential.dto.task.OpsTaskDtos.TaskListResponse;
import com.zmartcredential.dto.task.OpsTaskDtos.TaskRequest;
import com.zmartcredential.dto.task.OpsTaskDtos.TaskRow;
import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.Task;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.TaskRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OpsTaskService {

    private static final DateTimeFormatter DUE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US);

    private final TaskRepository taskRepository;
    private final AppUserRepository appUserRepository;
    private final OpsLookupService lookup;
    private final PermissionService permissionService;
    private final NotificationService notificationService;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public TaskListResponse list(String status, String priority, Long providerId, Long assigneeId, String q) {
        permissionService.require("task", "list");
        Long orgId = authContext.orgId();
        LocalDate today = LocalDate.now();
        Map<Long, Provider> providers = lookup.providersById(orgId);
        List<Task> all = taskRepository.findByOrgIdOrderByCreatedAtDesc(orgId);
        Map<Long, String> users = lookup.userNames(userIds(all));
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase(Locale.ROOT);

        List<Task> base = new ArrayList<>();
        for (Task t : all) {
            if (priority != null && !priority.isBlank() && !priority.equals(t.getPriority())) continue;
            if (providerId != null && !providerId.equals(t.getProviderId())) continue;
            if (assigneeId != null && !assigneeId.equals(t.getAssigneeUserId())) continue;
            if (needle != null) {
                String hay = (t.getTitle() + " " + nz(t.getDescription()) + " "
                        + nz(OpsLookupService.plainName(providers.get(t.getProviderId())))).toLowerCase(Locale.ROOT);
                if (!hay.contains(needle)) continue;
            }
            base.add(t);
        }
        long open = base.stream().filter(t -> "open".equals(t.getStatus())).count();
        long inProgress = base.stream().filter(t -> "in_progress".equals(t.getStatus())).count();
        long done = base.stream().filter(t -> "done".equals(t.getStatus())).count();
        long overdue = base.stream().filter(t -> isOverdue(t, today)).count();

        List<TaskRow> items = base.stream()
                .filter(t -> status == null || status.isBlank() || "all".equals(status) || status.equals(t.getStatus()))
                .sorted(Comparator.comparing((Task t) -> "done".equals(t.getStatus()))
                        .thenComparing(Task::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(t -> toRow(t, providers, users, today))
                .toList();
        return new TaskListResponse(items, new TaskCounts(open, inProgress, done, base.size(), overdue));
    }

    @Transactional
    public TaskRow create(TaskRequest req) {
        permissionService.require("task", "create");
        Long orgId = authContext.orgId();
        Task t = new Task();
        t.setOrgId(orgId);
        t.setStatus("open");
        t.setCreatedBy(authContext.userId());
        apply(t, req, orgId);
        taskRepository.save(t);

        String body = t.getDueDate() != null ? "Due " + DUE_FMT.format(t.getDueDate()) : "No due date";
        String title = "New task: " + t.getTitle();
        if (t.getAssigneeUserId() != null && !t.getAssigneeUserId().equals(authContext.userId())) {
            notificationService.notifyUser(orgId, t.getAssigneeUserId(), title, body, "CheckSquare", NotificationService.ACCENT);
        } else {
            notificationService.notifyOrg(orgId, title, body, "CheckSquare", NotificationService.ACCENT);
        }
        return single(t, orgId);
    }

    @Transactional
    public TaskRow update(Long id, TaskRequest req) {
        permissionService.require("task", "update");
        Long orgId = authContext.orgId();
        Task t = load(id, orgId);
        apply(t, req, orgId);
        taskRepository.save(t);
        return single(t, orgId);
    }

    @Transactional
    public TaskRow updateStatus(Long id, String status) {
        permissionService.require("task", "update");
        Long orgId = authContext.orgId();
        Task t = load(id, orgId);
        if (!status.equals(t.getStatus())) {
            t.setStatus(status);
            t.setCompletedAt("done".equals(status) ? LocalDateTime.now() : null);
            taskRepository.save(t);
        }
        return single(t, orgId);
    }

    @Transactional
    public void delete(Long id) {
        permissionService.require("task", "delete");
        Task t = load(id, authContext.orgId());
        taskRepository.delete(t);
    }

    private void apply(Task t, TaskRequest req, Long orgId) {
        t.setTitle(req.title().trim());
        t.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        t.setPriority(req.priority() == null || req.priority().isBlank() ? "medium" : req.priority());
        t.setDueDate(req.dueDate());
        if (req.providerId() != null) lookup.requireProvider(orgId, req.providerId());
        t.setProviderId(req.providerId());
        if (req.assigneeUserId() != null) {
            AppUser u = appUserRepository.findByIdAndOrgId(req.assigneeUserId(), orgId)
                    .orElseThrow(() -> new BadRequestException("Assignee must be a user of this organization"));
            if ("provider".equals(u.getRole())) throw new BadRequestException("Tasks can only be assigned to staff users");
        }
        t.setAssigneeUserId(req.assigneeUserId());
    }

    private Task load(Long id, Long orgId) {
        return taskRepository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Task", id));
    }

    private TaskRow single(Task t, Long orgId) {
        Map<Long, Provider> providers = t.getProviderId() == null ? Map.of()
                : Map.of(t.getProviderId(), lookup.requireProvider(orgId, t.getProviderId()));
        return toRow(t, providers, lookup.userNames(userIds(List.of(t))), LocalDate.now());
    }

    private static Set<Long> userIds(List<Task> tasks) {
        Set<Long> ids = new HashSet<>();
        for (Task t : tasks) {
            if (t.getAssigneeUserId() != null) ids.add(t.getAssigneeUserId());
            if (t.getCreatedBy() != null) ids.add(t.getCreatedBy());
        }
        return ids;
    }

    private static boolean isOverdue(Task t, LocalDate today) {
        return t.getDueDate() != null && t.getDueDate().isBefore(today) && !"done".equals(t.getStatus());
    }

    private static TaskRow toRow(Task t, Map<Long, Provider> providers, Map<Long, String> users, LocalDate today) {
        Provider p = t.getProviderId() == null ? null : providers.get(t.getProviderId());
        return new TaskRow(t.getId(), t.getTitle(), t.getDescription(), t.getPriority(), t.getStatus(), t.getDueDate(),
                isOverdue(t, today), t.getProviderId(), OpsLookupService.plainName(p), t.getAssigneeUserId(),
                users.get(t.getAssigneeUserId()), t.getCreatedBy(), users.get(t.getCreatedBy()), t.getCompletedAt(),
                t.getCreatedAt(), t.getUpdatedAt());
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
