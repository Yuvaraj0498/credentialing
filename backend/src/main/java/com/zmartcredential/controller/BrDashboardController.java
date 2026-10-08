package com.zmartcredential.controller;

import com.zmartcredential.dto.report.BrDashboardDtos.Counters;
import com.zmartcredential.dto.report.BrDashboardDtos.Summary;
import com.zmartcredential.service.BrDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Dashboard")
public class BrDashboardController {

    private final BrDashboardService service;

    @GetMapping("/api/dashboard/summary")
    @Operation(summary = "Dashboard stat cards, payer charts and upcoming document expirations")
    public Summary summary() {
        return service.summary();
    }

    @GetMapping("/api/me/counters")
    @Operation(summary = "Sidebar badge counters for the current user")
    public Counters counters() {
        return service.counters();
    }
}
