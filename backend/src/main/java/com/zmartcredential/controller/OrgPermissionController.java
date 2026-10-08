package com.zmartcredential.controller;

import com.zmartcredential.dto.organization.PermissionDtos.PermissionMatrixRequest;
import com.zmartcredential.dto.organization.PermissionDtos.PermissionMatrixResponse;
import com.zmartcredential.service.OrgPermissionMatrixService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Permissions")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OrgPermissionController {

    private final OrgPermissionMatrixService service;

    @Operation(summary = "Effective permission matrix for the current organization")
    @GetMapping("/permissions")
    public PermissionMatrixResponse get() {
        return service.get();
    }

    @Operation(summary = "Save organization permission overrides")
    @PutMapping("/permissions")
    public PermissionMatrixResponse save(@Valid @RequestBody PermissionMatrixRequest req) {
        return service.saveOrgOverrides(req);
    }

    @Operation(summary = "Reset organization permissions to the global defaults")
    @PostMapping("/permissions/reset")
    public PermissionMatrixResponse reset() {
        return service.resetOrgOverrides();
    }

    @Operation(summary = "Edit global default permissions (platform admin)")
    @PutMapping("/admin/permissions/defaults")
    public PermissionMatrixResponse saveDefaults(@Valid @RequestBody PermissionMatrixRequest req) {
        return service.saveDefaults(req);
    }
}
