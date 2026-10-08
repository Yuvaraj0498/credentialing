package com.zmartcredential.controller;

import com.zmartcredential.dto.organization.PublicCatalogDtos.InviteCodeOrg;
import com.zmartcredential.dto.organization.PublicCatalogDtos.PublicPackage;
import com.zmartcredential.dto.organization.PublicCatalogDtos.PublicState;
import com.zmartcredential.service.PublicCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Public (sign-up)")
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicCatalogController {

    private final PublicCatalogService service;

    @Operation(summary = "Subscription packages with features (no auth)")
    @GetMapping("/packages")
    public List<PublicPackage> packages() {
        return service.packages();
    }

    @Operation(summary = "US states (no auth)")
    @GetMapping("/states")
    public List<PublicState> states() {
        return service.states();
    }

    @Operation(summary = "Resolve an organization invite code to the organization name (no auth)")
    @GetMapping("/organizations/by-invite-code/{code}")
    public InviteCodeOrg byInviteCode(@PathVariable String code) {
        return service.orgByInviteCode(code);
    }
}
