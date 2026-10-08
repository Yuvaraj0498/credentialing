package com.zmartcredential.controller;

import com.zmartcredential.dto.auth.OrgSignupRequest;
import com.zmartcredential.dto.auth.PlatformDtos.AdminSummary;
import com.zmartcredential.dto.auth.PlatformDtos.PlatformSummary;
import com.zmartcredential.service.PlatformAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Super admin")
@RestController
@RequestMapping("/api/platform")
@RequiredArgsConstructor
public class PlatformAdminController {

    private final PlatformAdminService service;

    @Operation(summary = "Super admin dashboard counts")
    @GetMapping("/summary")
    public PlatformSummary summary() {
        return service.summary();
    }

    @Operation(summary = "Admins created (one per organization account)")
    @GetMapping("/admins")
    public List<AdminSummary> admins() {
        return service.listAdmins();
    }

    @Operation(summary = "Create an admin: the organization sign-up workflow (organization, admin, plan, payment)")
    @PostMapping("/admins")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminSummary create(@Valid @RequestBody OrgSignupRequest req) {
        return service.createAdmin(req);
    }
}
