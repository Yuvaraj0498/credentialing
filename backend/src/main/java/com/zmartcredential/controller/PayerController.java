package com.zmartcredential.controller;

import com.zmartcredential.dto.payer.PayerFormResponse;
import com.zmartcredential.dto.payer.PayerOverviewItem;
import com.zmartcredential.dto.payer.PayerRequest;
import com.zmartcredential.dto.payer.PayerResponse;
import com.zmartcredential.service.PayerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Payers")
@RestController
@RequestMapping("/api/payers")
@RequiredArgsConstructor
public class PayerController {

    private final PayerService payerService;

    @Operation(summary = "List payers (with their application forms)")
    @GetMapping
    public List<PayerResponse> list(@RequestParam(defaultValue = "false") boolean activeOnly,
                                    @RequestParam(required = false) String scope) {
        return payerService.list(activeOnly, scope);
    }

    @Operation(summary = "Per-payer enrollment stats for the current organization")
    @GetMapping("/overview")
    public List<PayerOverviewItem> overview(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return payerService.overview(activeOnly);
    }

    @Operation(summary = "Get a payer")
    @GetMapping("/{id}")
    public PayerResponse get(@PathVariable Long id) {
        return payerService.get(id);
    }

    @Operation(summary = "List a payer's application forms")
    @GetMapping("/{id}/forms")
    public List<PayerFormResponse> forms(@PathVariable Long id) {
        return payerService.forms(id);
    }

    @Operation(summary = "Create a payer")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PayerResponse create(@Valid @RequestBody PayerRequest req) {
        return payerService.create(req);
    }

    @Operation(summary = "Organization admin: add a payer (duplicates by name / portal URL are checked against every payer)")
    @PostMapping("/org-add")
    public com.zmartcredential.service.PayerService.OrgPayerAddResult orgAdd(
            @Valid @RequestBody com.zmartcredential.dto.payer.PlatformPayerRequest req) {
        return payerService.orgAdd(req);
    }

    @Operation(summary = "Organization admin: enable an existing payer that is switched off for the organization")
    @PostMapping("/{id}/org-enable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void orgEnable(@PathVariable Long id) {
        payerService.orgEnable(id);
    }

    @Operation(summary = "Organization admin: every payer with whether it is on for the organization")
    @GetMapping("/org-settings")
    public List<com.zmartcredential.service.PayerService.OrgPayerItem> orgSettings() {
        return payerService.myOrgPayers();
    }

    public record OrgEnabledRequest(@jakarta.validation.constraints.NotNull(message = "enabled is required") Boolean enabled) {
    }

    @Operation(summary = "Organization admin: switch a payer on / off for the organization")
    @PatchMapping("/{id}/org-enabled")
    public com.zmartcredential.service.PayerService.OrgPayerItem orgEnabled(@PathVariable Long id, @Valid @RequestBody OrgEnabledRequest req) {
        return payerService.setMyOrgPayer(id, req.enabled());
    }

    @Operation(summary = "Update a payer")
    @PutMapping("/{id}")
    public PayerResponse update(@PathVariable Long id, @Valid @RequestBody PayerRequest req) {
        return payerService.update(id, req);
    }

    @Operation(summary = "Delete a payer (409 when referenced; deactivate instead)")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        payerService.delete(id);
    }
}
