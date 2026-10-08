package com.zmartcredential.controller;

import com.zmartcredential.dto.caqh.OpsCaqhDtos.AttestationsResponse;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.CaqhConfigResponse;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.CaqhConfigUpdateRequest;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.CaqhProviderStatus;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.CaqhProviderUpdateRequest;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.CaqhStatusResponse;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.CaqhTestResponse;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.ReminderLogItem;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.RuleEnabledRequest;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.RuleItem;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.RuleRequest;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.RuleRunResponse;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.SendReminderRequest;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.SyncDeferredResponse;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.SyncRunItem;
import com.zmartcredential.dto.caqh.OpsCaqhDtos.SyncRunRequest;
import com.zmartcredential.service.OpsCaqhService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "CAQH")
@RestController
@RequestMapping("/api/caqh")
@RequiredArgsConstructor
public class OpsCaqhController {

    private final OpsCaqhService service;

    @Operation(summary = "CAQH connection + auto-sync settings (secrets never returned)")
    @GetMapping("/config")
    public CaqhConfigResponse config() {
        return service.getConfig();
    }

    @Operation(summary = "Update CAQH settings (partial; null fields unchanged)")
    @PutMapping("/config")
    public CaqhConfigResponse updateConfig(@Valid @RequestBody CaqhConfigUpdateRequest req) {
        return service.updateConfig(req);
    }

    @Operation(summary = "Test the CAQH connection (deferred integration)")
    @PostMapping("/config/test")
    public CaqhTestResponse test() {
        return service.testConnection();
    }

    @Operation(summary = "CAQH enrollment and attestation status per provider")
    @GetMapping("/status")
    public CaqhStatusResponse status() {
        return service.status();
    }

    @Operation(summary = "Manually set a provider's CAQH ID / attestation data")
    @PatchMapping("/providers/{providerId}")
    public CaqhProviderStatus updateProvider(@PathVariable Long providerId, @Valid @RequestBody CaqhProviderUpdateRequest req) {
        return service.updateProvider(providerId, req);
    }

    @Operation(summary = "Auto-sync run history")
    @GetMapping("/sync-runs")
    public List<SyncRunItem> syncRuns(@RequestParam(defaultValue = "20") int limit) {
        return service.syncRuns(limit);
    }

    @Operation(summary = "Sync now / sync all (deferred integration; no run is recorded)")
    @PostMapping("/sync-runs")
    public SyncDeferredResponse sync(@RequestBody(required = false) SyncRunRequest req) {
        return service.requestSync(req == null ? null : req.providerId());
    }

    @Operation(summary = "Upcoming CAQH attestations")
    @GetMapping("/attestations")
    public AttestationsResponse attestations(@RequestParam(defaultValue = "45") int maxDays) {
        return service.attestations(maxDays);
    }

    @Operation(summary = "Attestation reminder rules")
    @GetMapping("/attestation-rules")
    public List<RuleItem> rules() {
        return service.rules();
    }

    @Operation(summary = "Create a reminder rule")
    @PostMapping("/attestation-rules")
    @ResponseStatus(HttpStatus.CREATED)
    public RuleItem createRule(@Valid @RequestBody RuleRequest req) {
        return service.createRule(req);
    }

    @Operation(summary = "Update a reminder rule")
    @PutMapping("/attestation-rules/{id}")
    public RuleItem updateRule(@PathVariable Long id, @Valid @RequestBody RuleRequest req) {
        return service.updateRule(id, req);
    }

    @Operation(summary = "Enable or disable a reminder rule")
    @PatchMapping("/attestation-rules/{id}/enabled")
    public RuleItem setEnabled(@PathVariable Long id, @Valid @RequestBody RuleEnabledRequest req) {
        return service.setRuleEnabled(id, req.enabled());
    }

    @Operation(summary = "Delete a reminder rule")
    @DeleteMapping("/attestation-rules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRule(@PathVariable Long id) {
        service.deleteRule(id);
    }

    @Operation(summary = "Evaluate enabled rules; dryRun=false queues reminders")
    @PostMapping("/attestation-rules/run")
    public RuleRunResponse run(@RequestParam(defaultValue = "true") boolean dryRun) {
        return service.runRules(dryRun);
    }

    @Operation(summary = "Queue an attestation reminder for one provider now")
    @PostMapping("/attestation-reminders")
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderLogItem send(@Valid @RequestBody SendReminderRequest req) {
        return service.sendReminder(req);
    }

    @Operation(summary = "Attestation reminder send log (latest 50)")
    @GetMapping("/attestation-reminders/log")
    public List<ReminderLogItem> log() {
        return service.reminderLog();
    }
}
