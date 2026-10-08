package com.zmartcredential.controller;

import com.zmartcredential.common.PageResponse;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderAssignmentRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderAssignmentSummary;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderBulkAssignRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderBulkAssignResult;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderCreateRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderDetail;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderImportRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderImportResult;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderListItem;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderLite;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderStatusRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderUpdateRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.ProviderInviteNewRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.ProviderInviteRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.ProviderInviteResponse;
import com.zmartcredential.service.ProviderImportService;
import com.zmartcredential.service.ProviderInviteService;
import com.zmartcredential.service.ProviderService;
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

@Tag(name = "Providers")
@RestController
@RequestMapping("/api/providers")
@RequiredArgsConstructor
public class ProviderController {

    private final ProviderService providerService;
    private final com.zmartcredential.service.OrgUserService orgUserService;
    private final ProviderImportService importService;
    private final ProviderInviteService inviteService;

    @Operation(summary = "Paged provider list with document progress and enrollment counts")
    @GetMapping
    public PageResponse<ProviderListItem> list(@RequestParam(required = false) String q,
                                               @RequestParam(required = false) String status,
                                               @RequestParam(required = false) Long practiceId,
                                               @RequestParam(required = false) Long locationId,
                                               @RequestParam(required = false) Long clientId,
                                               @RequestParam(required = false) Boolean unassigned,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "25") int size,
                                               @RequestParam(required = false) String sort) {
        return providerService.list(q, status, practiceId, locationId, clientId, unassigned, page, size, sort);
    }

    @Operation(summary = "All providers (id, name, NPI...) for dropdowns")
    @GetMapping("/all-lite")
    public List<ProviderLite> allLite() {
        return providerService.allLite();
    }

    @Operation(summary = "Assigned / unassigned provider counts per location")
    @GetMapping("/assignment-summary")
    public ProviderAssignmentSummary assignmentSummary() {
        return providerService.assignmentSummary();
    }

    @Operation(summary = "Provider detail incl. documents")
    @GetMapping("/{id:\\d+}")
    public ProviderDetail get(@PathVariable Long id) {
        return providerService.get(id);
    }

    @Operation(summary = "Add a provider manually")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProviderDetail create(@Valid @RequestBody ProviderCreateRequest req) {
        return providerService.create(req);
    }

    @Operation(summary = "Update a provider (ProviderEditModal)")
    @PutMapping("/{id:\\d+}")
    public ProviderDetail update(@PathVariable Long id, @Valid @RequestBody ProviderUpdateRequest req) {
        return providerService.update(id, req);
    }

    @Operation(summary = "Change provider status")
    @PatchMapping("/{id:\\d+}/status")
    public ProviderDetail status(@PathVariable Long id, @Valid @RequestBody ProviderStatusRequest req) {
        return providerService.updateStatus(id, req.status());
    }

    @Operation(summary = "Assign the provider to a location (null = unassign)")
    @PutMapping("/{id:\\d+}/assignment")
    public ProviderDetail assign(@PathVariable Long id, @RequestBody ProviderAssignmentRequest req) {
        return providerService.assign(id, req.locationId());
    }

    @Operation(summary = "Add a provider with their sign-in (username + password)")
    @PostMapping("/with-login")
    @ResponseStatus(HttpStatus.CREATED)
    public ProviderDetail createWithLogin(@Valid @RequestBody com.zmartcredential.dto.organization.UserDtos.UserWithProviderRequest req) {
        return providerService.get(orgUserService.createWithProvider(req).providerId());
    }

    @Operation(summary = "Assign several providers to a location (null = unassign)")
    @PostMapping("/bulk-assign")
    public ProviderBulkAssignResult bulkAssign(@Valid @RequestBody ProviderBulkAssignRequest req) {
        return providerService.bulkAssign(req);
    }

    @Operation(summary = "Delete a provider")
    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        providerService.delete(id);
    }

    @Operation(summary = "Import providers parsed from a CAQH CSV (single export or bulk roster)")
    @PostMapping("/import")
    public ProviderImportResult importProviders(@Valid @RequestBody ProviderImportRequest req) {
        return importService.importProviders(req);
    }

    @Operation(summary = "Send a secure upload link (token + PIN) to an existing provider; email is queued")
    @PostMapping("/{id:\\d+}/invites")
    @ResponseStatus(HttpStatus.CREATED)
    public ProviderInviteResponse invite(@PathVariable Long id, @Valid @RequestBody ProviderInviteRequest req) {
        return inviteService.invite(id, req);
    }

    @Operation(summary = "Create a draft provider and send them a secure upload link")
    @PostMapping("/invite-new")
    @ResponseStatus(HttpStatus.CREATED)
    public ProviderInviteResponse inviteNew(@Valid @RequestBody ProviderInviteNewRequest req) {
        return inviteService.inviteNew(req);
    }
}
