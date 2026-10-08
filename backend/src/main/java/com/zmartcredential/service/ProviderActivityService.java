package com.zmartcredential.service;

import com.zmartcredential.dto.provider.ProviderActivityDtos.FollowUpRequest;
import com.zmartcredential.dto.provider.ProviderActivityDtos.FollowUpResponse;
import com.zmartcredential.dto.provider.ProviderActivityDtos.FollowUpTask;
import com.zmartcredential.dto.provider.ProviderActivityDtos.TimeEntryRequest;
import com.zmartcredential.dto.provider.ProviderActivityDtos.TimeEntryResponse;
import com.zmartcredential.entity.FollowUp;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.Task;
import com.zmartcredential.entity.TimeEntry;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.FollowUpRepository;
import com.zmartcredential.repository.TaskRepository;
import com.zmartcredential.repository.TimeEntryRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.zmartcredential.service.ProviderModuleSupport.blankToNull;
import static com.zmartcredential.service.ProviderModuleSupport.fullName;

/** Provider detail "Activity & Time" tab: time tracker and follow-up log. */
@Service
@RequiredArgsConstructor
public class ProviderActivityService {

    private static final Role[] WRITERS = {Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK};

    private final TimeEntryRepository timeEntryRepository;
    private final FollowUpRepository followUpRepository;
    private final TaskRepository taskRepository;
    private final ProviderModuleSupport support;
    private final AuthContext authContext;

    // ---------- time entries ----------

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> timeEntries(Long providerId) {
        Provider p = support.loadForStaff(providerId);
        List<TimeEntry> entries = timeEntryRepository.findByOrgIdAndProviderIdOrderByStartedAtDesc(p.getOrgId(), p.getId());
        Map<Long, String> names = support.userNames(entries.stream().map(TimeEntry::getUserId).toList());
        return entries.stream().map(e -> toResponse(e, names.get(e.getUserId()))).toList();
    }

    @Transactional
    public TimeEntryResponse addTimeEntry(Long providerId, TimeEntryRequest req) {
        authContext.requireRole(WRITERS);
        Provider p = support.loadForStaff(providerId);
        if (req.endedAt() != null && req.endedAt().isBefore(req.startedAt())) {
            throw new BadRequestException("End time cannot be before the start time");
        }
        Integer seconds = req.seconds();
        if (seconds == null) {
            if (req.endedAt() == null) throw new BadRequestException("Provide the duration or the end time");
            seconds = (int) Duration.between(req.startedAt(), req.endedAt()).getSeconds();
        }
        TimeEntry e = new TimeEntry();
        e.setOrgId(p.getOrgId());
        e.setProviderId(p.getId());
        e.setUserId(authContext.userId());
        e.setStartedAt(req.startedAt());
        e.setEndedAt(req.endedAt());
        e.setSeconds(seconds);
        e.setNote(blankToNull(req.note()));
        e = timeEntryRepository.save(e);
        return toResponse(e, support.userName(e.getUserId()));
    }

    @Transactional
    public void deleteTimeEntry(Long id) {
        authContext.requireRole(WRITERS);
        TimeEntry e = timeEntryRepository.findByIdAndOrgId(id, authContext.orgId())
                .orElseThrow(() -> NotFoundException.of("Time entry", id));
        if (!Objects.equals(e.getUserId(), authContext.userId()) && !authContext.hasRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN)) {
            throw new ForbiddenException("You can only delete your own time entries");
        }
        timeEntryRepository.delete(e);
    }

    private static TimeEntryResponse toResponse(TimeEntry e, String userName) {
        return new TimeEntryResponse(e.getId(), e.getProviderId(), e.getUserId(), userName, e.getStartedAt(),
                e.getEndedAt(), e.getSeconds() == null ? 0 : e.getSeconds(), e.getNote(), e.getCreatedAt());
    }

    // ---------- follow-ups ----------

    @Transactional(readOnly = true)
    public List<FollowUpResponse> followUps(Long providerId) {
        Provider p = support.loadForStaff(providerId);
        List<FollowUp> list = followUpRepository.findByOrgIdAndProviderIdOrderByOccurredAtDesc(p.getOrgId(), p.getId());
        Map<Long, String> names = support.userNames(list.stream().map(FollowUp::getUserId).toList());
        return list.stream().map(f -> toResponse(f, names.get(f.getUserId()), null)).toList();
    }

    @Transactional
    public FollowUpResponse addFollowUp(Long providerId, FollowUpRequest req) {
        authContext.requireRole(WRITERS);
        Provider p = support.loadForStaff(providerId);
        if (req.nextDate() != null && req.nextDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("The next follow-up date cannot be in the past");
        }
        FollowUp f = new FollowUp();
        f.setOrgId(p.getOrgId());
        f.setProviderId(p.getId());
        f.setUserId(authContext.userId());
        f.setType(req.type());
        f.setSubject(req.subject().trim());
        f.setOutcome(blankToNull(req.outcome()));
        f.setOccurredAt(req.occurredAt() == null ? LocalDateTime.now() : req.occurredAt());
        f.setNextDate(req.nextDate());
        f = followUpRepository.save(f);

        FollowUpTask taskDto = null;
        if (req.nextDate() != null) {
            Task t = new Task();
            t.setOrgId(p.getOrgId());
            String title = "Follow up: " + f.getSubject();
            t.setTitle(title.length() > 255 ? title.substring(0, 255) : title);
            t.setDescription("Follow-up with " + fullName(p) + " (" + req.type().replace('_', ' ') + ")"
                    + (f.getOutcome() == null ? "" : "\n\nLast outcome: " + f.getOutcome()));
            t.setPriority("medium");
            t.setStatus("open");
            t.setDueDate(req.nextDate());
            t.setProviderId(p.getId());
            t.setAssigneeUserId(authContext.userId());
            t.setCreatedBy(authContext.userId());
            t = taskRepository.save(t);
            taskDto = new FollowUpTask(t.getId(), t.getTitle(), t.getDueDate(), t.getStatus(), t.getPriority());
        }
        return toResponse(f, support.userName(f.getUserId()), taskDto);
    }

    private static FollowUpResponse toResponse(FollowUp f, String userName, FollowUpTask task) {
        return new FollowUpResponse(f.getId(), f.getProviderId(), f.getUserId(), userName, f.getType(), f.getSubject(),
                f.getOutcome(), f.getOccurredAt(), f.getNextDate(), f.getCreatedAt(), task);
    }
}
