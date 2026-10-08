package com.zmartcredential.controller;

import com.zmartcredential.dto.organization.AdminOrgDtos.AdminOrganizationCreateRequest;
import com.zmartcredential.dto.organization.AdminOrgDtos.AdminOrganizationResponse;
import com.zmartcredential.dto.organization.AdminOrgDtos.OrgStatusRequest;
import com.zmartcredential.service.PlatformOrgAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Platform admin - organizations")
@RestController
@RequestMapping("/api/admin/organizations")
@RequiredArgsConstructor
public class PlatformOrgAdminController {

    private final PlatformOrgAdminService service;

    @Operation(summary = "List all organizations with counts (platform admin)")
    @GetMapping
    public List<AdminOrganizationResponse> list() {
        return service.list();
    }

    @Operation(summary = "Create an organization and optionally its first org admin (platform admin)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminOrganizationResponse create(@Valid @RequestBody AdminOrganizationCreateRequest req) {
        return service.create(req);
    }

    @Operation(summary = "Activate or suspend an organization (platform admin)")
    @PatchMapping("/{id}/status")
    public AdminOrganizationResponse setStatus(@PathVariable Long id, @Valid @RequestBody OrgStatusRequest req) {
        return service.setStatus(id, req.status());
    }
}
