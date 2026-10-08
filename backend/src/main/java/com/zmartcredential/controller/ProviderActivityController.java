package com.zmartcredential.controller;

import com.zmartcredential.dto.provider.ProviderActivityDtos.FollowUpRequest;
import com.zmartcredential.dto.provider.ProviderActivityDtos.FollowUpResponse;
import com.zmartcredential.dto.provider.ProviderActivityDtos.TimeEntryRequest;
import com.zmartcredential.dto.provider.ProviderActivityDtos.TimeEntryResponse;
import com.zmartcredential.service.ProviderActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Provider activity")
@RestController
@RequiredArgsConstructor
public class ProviderActivityController {

    private final ProviderActivityService activityService;

    @Operation(summary = "Time log of a provider (newest first)")
    @GetMapping("/api/providers/{id:\\d+}/time-entries")
    public List<TimeEntryResponse> timeEntries(@PathVariable Long id) {
        return activityService.timeEntries(id);
    }

    @Operation(summary = "Log time spent on a provider")
    @PostMapping("/api/providers/{id:\\d+}/time-entries")
    @ResponseStatus(HttpStatus.CREATED)
    public TimeEntryResponse addTimeEntry(@PathVariable Long id, @Valid @RequestBody TimeEntryRequest req) {
        return activityService.addTimeEntry(id, req);
    }

    @Operation(summary = "Delete a time entry (own entries; admins any)")
    @DeleteMapping("/api/time-entries/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTimeEntry(@PathVariable Long id) {
        activityService.deleteTimeEntry(id);
    }

    @Operation(summary = "Follow-up log of a provider (newest first)")
    @GetMapping("/api/providers/{id:\\d+}/follow-ups")
    public List<FollowUpResponse> followUps(@PathVariable Long id) {
        return activityService.followUps(id);
    }

    @Operation(summary = "Log a follow-up; nextDate also creates a task due that day")
    @PostMapping("/api/providers/{id:\\d+}/follow-ups")
    @ResponseStatus(HttpStatus.CREATED)
    public FollowUpResponse addFollowUp(@PathVariable Long id, @Valid @RequestBody FollowUpRequest req) {
        return activityService.addFollowUp(id, req);
    }
}
