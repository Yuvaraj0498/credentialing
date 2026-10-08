package com.zmartcredential.controller;

import com.zmartcredential.common.PageResponse;
import com.zmartcredential.dto.enrollment.CaqhAuthorizationItem;
import com.zmartcredential.dto.enrollment.CaqhAuthorizationListResponse;
import com.zmartcredential.dto.enrollment.CaqhAuthorizationSummaryItem;
import com.zmartcredential.dto.enrollment.CaqhAuthorizationUpdateRequest;
import com.zmartcredential.dto.payer.PayerSubmissionBatchResponse;
import com.zmartcredential.dto.payer.PayerSubmissionRequest;
import com.zmartcredential.dto.payer.PayerSubmissionResponse;
import com.zmartcredential.dto.payer.PayerSubmissionUpdateRequest;
import com.zmartcredential.dto.payer.PortalLoginResponse;
import com.zmartcredential.dto.enrollment.RecredScheduleResponse;
import com.zmartcredential.dto.enrollment.RosterReconciliationResponse;
import com.zmartcredential.dto.enrollment.RosterTerminationResponse;
import com.zmartcredential.dto.enrollment.RosterUploadRequest;
import com.zmartcredential.dto.enrollment.RosterUploadResponse;
import com.zmartcredential.service.CaqhPayerAuthorizationService;
import com.zmartcredential.service.PayerSubmissionService;
import com.zmartcredential.service.RecredentialingService;
import com.zmartcredential.service.RosterReconciliationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Payer submissions, CAQH payer authorizations, re-credentialing schedule and roster reconciliation. */
@Tag(name = "Payer Operations")
@RestController
@RequiredArgsConstructor
public class PayerOperationsController {

    private final PayerSubmissionService submissionService;
    private final CaqhPayerAuthorizationService caqhService;
    private final RecredentialingService recredentialingService;
    private final RosterReconciliationService rosterService;

    // ---- submissions

    @Operation(summary = "Queue payer submissions for a provider (automated submission deferred)")
    @PostMapping("/api/payer-submissions")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public PayerSubmissionBatchResponse submit(@Valid @RequestBody PayerSubmissionRequest req) {
        return submissionService.create(req);
    }

    @Operation(summary = "Submission log")
    @GetMapping("/api/payer-submissions")
    public PageResponse<PayerSubmissionResponse> submissions(@RequestParam(required = false) Long providerId,
                                                             @RequestParam(required = false) Long payerId,
                                                             @RequestParam(required = false) String status,
                                                             @RequestParam(defaultValue = "0") int page,
                                                             @RequestParam(defaultValue = "20") int size) {
        return submissionService.list(providerId, payerId, status, page, size);
    }

    @Operation(summary = "Record a manual submission outcome")
    @PatchMapping("/api/payer-submissions/{id}")
    public PayerSubmissionResponse updateSubmission(@PathVariable Long id, @Valid @RequestBody PayerSubmissionUpdateRequest req) {
        return submissionService.update(id, req);
    }

    @Operation(summary = "Sign in to the payer's portal with the stored login (headless browser) and report what the portal showed")
    @PostMapping("/api/payer-submissions/{id}/portal-login")
    public PortalLoginResponse portalLogin(@PathVariable Long id) {
        return submissionService.portalLogin(id);
    }

    // ---- CAQH payer authorizations

    @Operation(summary = "CAQH payer authorizations of a provider")
    @GetMapping("/api/providers/{providerId}/caqh-authorizations")
    public CaqhAuthorizationListResponse caqh(@PathVariable Long providerId) {
        return caqhService.list(providerId);
    }

    @Operation(summary = "Authorize or revoke a payer's access to the CAQH profile")
    @PutMapping("/api/providers/{providerId}/caqh-authorizations/{payerId}")
    public CaqhAuthorizationItem caqhUpdate(@PathVariable Long providerId, @PathVariable Long payerId,
                                            @Valid @RequestBody CaqhAuthorizationUpdateRequest req) {
        return caqhService.update(providerId, payerId, req.authorized());
    }

    @Operation(summary = "Authorize all CAQH-participating payers")
    @PostMapping("/api/providers/{providerId}/caqh-authorizations/authorize-all")
    public CaqhAuthorizationListResponse caqhAuthorizeAll(@PathVariable Long providerId) {
        return caqhService.authorizeAll(providerId);
    }

    @Operation(summary = "Per-provider CAQH authorization counts")
    @GetMapping("/api/caqh-authorizations/summary")
    public List<CaqhAuthorizationSummaryItem> caqhSummary() {
        return caqhService.summary();
    }

    // ---- re-credentialing

    @Operation(summary = "Re-credentialing schedule of approved enrollments")
    @GetMapping("/api/recredentialing/schedule")
    public RecredScheduleResponse recredSchedule(@RequestParam(defaultValue = "all") String window) {
        return recredentialingService.schedule(window);
    }

    // ---- rosters

    @Operation(summary = "Upload a payer roster (rows parsed from CSV by the client)")
    @PostMapping("/api/payers/{payerId}/rosters")
    @ResponseStatus(HttpStatus.CREATED)
    public RosterUploadResponse uploadRoster(@PathVariable Long payerId, @Valid @RequestBody RosterUploadRequest req) {
        return rosterService.upload(payerId, req);
    }

    @Operation(summary = "Reconcile the latest payer roster against our approved enrollments")
    @GetMapping("/api/payers/{payerId}/roster-reconciliation")
    public RosterReconciliationResponse reconcile(@PathVariable Long payerId) {
        return rosterService.reconcile(payerId);
    }

    @Operation(summary = "Request termination of a roster listing (creates a task)")
    @PostMapping("/api/roster-entries/{entryId}/termination-request")
    public RosterTerminationResponse terminate(@PathVariable Long entryId) {
        return rosterService.requestTermination(entryId);
    }
}
