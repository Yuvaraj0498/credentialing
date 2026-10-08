package com.zmartcredential.controller;

import com.zmartcredential.dto.credentialing.OpsHubDtos.DeferredResponse;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationAlertSettings;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationAlertsResponse;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationNotifyRequest;
import com.zmartcredential.dto.credentialing.OpsHubDtos.HospitalItem;
import com.zmartcredential.dto.credentialing.OpsHubDtos.HospitalRequest;
import com.zmartcredential.dto.credentialing.OpsHubDtos.PrivilegeItemStatus;
import com.zmartcredential.dto.credentialing.OpsHubDtos.PrivilegeSummaryRow;
import com.zmartcredential.dto.credentialing.OpsHubDtos.PrivilegeUpsertRequest;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ProviderPrivilegesResponse;
import com.zmartcredential.dto.credentialing.OpsHubDtos.QueuedResponse;
import com.zmartcredential.dto.credentialing.OpsHubDtos.SanctionsResponse;
import com.zmartcredential.service.OpsExpirationAlertService;
import com.zmartcredential.service.OpsPrivilegeService;
import com.zmartcredential.service.OpsSanctionsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Credentialing hub")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OpsHubController {

    private final OpsPrivilegeService privilegeService;
    private final OpsExpirationAlertService expirationService;
    private final OpsSanctionsService sanctionsService;

    // ---------- Hospitals ----------
    @Operation(summary = "Hospitals of the organization")
    @GetMapping("/hospitals")
    public List<HospitalItem> hospitals() {
        return privilegeService.hospitals();
    }

    @Operation(summary = "Create a hospital")
    @PostMapping("/hospitals")
    @ResponseStatus(HttpStatus.CREATED)
    public HospitalItem createHospital(@Valid @RequestBody HospitalRequest req) {
        return privilegeService.createHospital(req);
    }

    @Operation(summary = "Update a hospital")
    @PutMapping("/hospitals/{id}")
    public HospitalItem updateHospital(@PathVariable Long id, @Valid @RequestBody HospitalRequest req) {
        return privilegeService.updateHospital(id, req);
    }

    @Operation(summary = "Delete a hospital (and its privilege records)")
    @DeleteMapping("/hospitals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHospital(@PathVariable Long id) {
        privilegeService.deleteHospital(id);
    }

    // ---------- Privileges ----------
    @Operation(summary = "Privilege catalog for the provider's specialty with statuses at a hospital")
    @GetMapping("/privileges")
    public ProviderPrivilegesResponse privileges(@RequestParam Long providerId, @RequestParam Long hospitalId) {
        return privilegeService.privileges(providerId, hospitalId);
    }

    @Operation(summary = "Set a privilege status (none removes it)")
    @PutMapping("/privileges")
    public PrivilegeItemStatus upsert(@Valid @RequestBody PrivilegeUpsertRequest req) {
        return privilegeService.upsert(req);
    }

    @Operation(summary = "Privilege counts per provider and hospital")
    @GetMapping("/privileges/summary")
    public List<PrivilegeSummaryRow> summary(@RequestParam(required = false) Long providerId,
                                             @RequestParam(required = false) Long hospitalId) {
        return privilegeService.summary(providerId, hospitalId);
    }

    // ---------- Expiration alerts ----------
    @Operation(summary = "Document expiration alert settings")
    @GetMapping("/settings/expiration-alerts")
    public ExpirationAlertSettings getAlertSettings() {
        return expirationService.getSettings();
    }

    @Operation(summary = "Update document expiration alert settings")
    @PutMapping("/settings/expiration-alerts")
    public ExpirationAlertSettings updateAlertSettings(@Valid @RequestBody ExpirationAlertSettings req) {
        return expirationService.updateSettings(req);
    }

    @Operation(summary = "Active document expiration alerts (tier=all|expired|critical|warning|info)")
    @GetMapping("/alerts/expirations")
    public ExpirationAlertsResponse expirations(@RequestParam(defaultValue = "all") String tier) {
        return expirationService.alerts(tier);
    }

    @Operation(summary = "Queue an expiration notice email to the provider (SMTP deferred)")
    @PostMapping("/alerts/expirations/notify")
    public QueuedResponse notifyProvider(@Valid @RequestBody ExpirationNotifyRequest req) {
        return expirationService.notifyProvider(req);
    }

    // ---------- Sanctions ----------
    @Operation(summary = "Sanctions / exclusion monitoring status per provider")
    @GetMapping("/sanctions/monitoring")
    public SanctionsResponse sanctions(@RequestParam(required = false) String q) {
        return sanctionsService.monitoring(q);
    }

    @Operation(summary = "Run all exclusion checks now (deferred integration)")
    @PostMapping("/sanctions/run-all")
    public DeferredResponse runAll() {
        return sanctionsService.runAll();
    }
}
