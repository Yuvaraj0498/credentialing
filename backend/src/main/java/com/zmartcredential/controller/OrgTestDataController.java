package com.zmartcredential.controller;

import com.zmartcredential.dto.organization.TestDataDtos.DataBundle;
import com.zmartcredential.dto.organization.TestDataDtos.DataImportResult;
import com.zmartcredential.dto.organization.TestDataDtos.TestDataCounts;
import com.zmartcredential.dto.organization.TestDataDtos.TestDataRequest;
import com.zmartcredential.dto.organization.TestDataDtos.TestDataResult;
import com.zmartcredential.service.OrgDataTransferService;
import com.zmartcredential.service.OrgTestDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Test data")
@RestController
@RequestMapping("/api/admin/test-data")
@RequiredArgsConstructor
public class OrgTestDataController {

    private final OrgTestDataService service;
    private final OrgDataTransferService transferService;

    @Operation(summary = "Counts of test-data rows in the current organization")
    @GetMapping("/summary")
    public TestDataCounts summary() {
        return service.summary();
    }

    @Operation(summary = "Generate fake test data in the current organization")
    @PostMapping
    public TestDataResult generate(@Valid @RequestBody(required = false) TestDataRequest req) {
        return service.generate(req == null ? new TestDataRequest(null, null, null, null, null) : req);
    }

    @Operation(summary = "Export the organization as JSON (clients, practices, locations, providers, enrollments, tasks; no users)")
    @GetMapping("/export")
    public DataBundle export() {
        return transferService.export();
    }

    @Operation(summary = "Import a JSON export or sample file; replaces the current test data")
    @PostMapping("/import")
    public DataImportResult importBundle(@Valid @RequestBody DataBundle bundle) {
        return transferService.importBundle(bundle);
    }

    @Operation(summary = "Delete all test-data rows of the current organization")
    @DeleteMapping
    public TestDataCounts purge() {
        return service.purge();
    }
}
