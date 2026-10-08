package com.zmartcredential.controller;

import com.zmartcredential.common.PageResponse;
import com.zmartcredential.dto.email.OpsEmailDtos.EmailLogItem;
import com.zmartcredential.dto.email.OpsEmailDtos.PreviewRequest;
import com.zmartcredential.dto.email.OpsEmailDtos.PreviewResponse;
import com.zmartcredential.dto.email.OpsEmailDtos.ReminderListResponse;
import com.zmartcredential.dto.email.OpsEmailDtos.ScheduleActiveRequest;
import com.zmartcredential.dto.email.OpsEmailDtos.ScheduleItem;
import com.zmartcredential.dto.email.OpsEmailDtos.ScheduleRequest;
import com.zmartcredential.dto.email.OpsEmailDtos.SendNowResponse;
import com.zmartcredential.dto.email.OpsEmailDtos.TemplateItem;
import com.zmartcredential.service.OpsEmailReminderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Email reminders")
@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class OpsEmailController {

    private final OpsEmailReminderService service;

    @Operation(summary = "Per-provider reminder rows derived from documents, email log and schedules")
    @GetMapping("/reminders")
    public ReminderListResponse reminders(@RequestParam(defaultValue = "all") String tab,
                                          @RequestParam(required = false) String q) {
        return service.reminders(tab, q);
    }

    @Operation(summary = "Email templates (system + organization)")
    @GetMapping("/templates")
    public List<TemplateItem> templates() {
        return service.templates();
    }

    @Operation(summary = "Render a template with a provider's data (or sample data)")
    @PostMapping("/templates/{id}/preview")
    public PreviewResponse preview(@PathVariable Long id, @RequestBody(required = false) PreviewRequest req) {
        return service.preview(id, req == null ? null : req.providerId());
    }

    @Operation(summary = "Reminder schedules")
    @GetMapping("/schedules")
    public List<ScheduleItem> schedules() {
        return service.schedules();
    }

    @Operation(summary = "Create a reminder schedule")
    @PostMapping("/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleItem create(@Valid @RequestBody ScheduleRequest req) {
        return service.createSchedule(req);
    }

    @Operation(summary = "Pause or resume a schedule")
    @PatchMapping("/schedules/{id}")
    public ScheduleItem setActive(@PathVariable Long id, @Valid @RequestBody ScheduleActiveRequest req) {
        return service.setActive(id, req.active());
    }

    @Operation(summary = "Delete a schedule")
    @DeleteMapping("/schedules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.deleteSchedule(id);
    }

    @Operation(summary = "Queue the schedule's emails now (SMTP delivery deferred)")
    @PostMapping("/schedules/{id}/send-now")
    public SendNowResponse sendNow(@PathVariable Long id) {
        return service.sendNow(id);
    }

    @Operation(summary = "Outbound email log")
    @GetMapping("/log")
    public PageResponse<EmailLogItem> log(@RequestParam(required = false) Long providerId,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "25") int size) {
        return service.log(providerId, page, size);
    }
}
