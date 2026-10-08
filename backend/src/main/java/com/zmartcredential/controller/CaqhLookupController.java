package com.zmartcredential.controller;

import com.zmartcredential.dto.caqh.CaqhLookupDtos.CaqhImportRequest;
import com.zmartcredential.dto.caqh.CaqhLookupDtos.CaqhImportResponse;
import com.zmartcredential.dto.caqh.CaqhLookupDtos.CaqhLookupConfigRequest;
import com.zmartcredential.dto.caqh.CaqhLookupDtos.CaqhLookupConfigResponse;
import com.zmartcredential.dto.caqh.CaqhLookupDtos.CaqhLookupTestResponse;
import com.zmartcredential.dto.caqh.CaqhLookupDtos.CaqhProfile;
import com.zmartcredential.service.CaqhLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "CAQH lookup")
@RestController
@RequestMapping("/api/caqh")
@RequiredArgsConstructor
public class CaqhLookupController {

    private final CaqhLookupService service;

    @Operation(summary = "CAQH lookup settings: mock database or real API (API key never returned)")
    @GetMapping("/lookup-config")
    public CaqhLookupConfigResponse config() {
        return service.getConfig();
    }

    @Operation(summary = "Update CAQH lookup settings (apiKey: null keeps the stored key, empty clears it)")
    @PutMapping("/lookup-config")
    public CaqhLookupConfigResponse updateConfig(@Valid @RequestBody CaqhLookupConfigRequest req) {
        return service.updateConfig(req);
    }

    @Operation(summary = "Test the configured CAQH lookup")
    @PostMapping("/lookup-config/test")
    public CaqhLookupTestResponse test() {
        return service.testConnection();
    }

    @Operation(summary = "Look up a provider profile and its verified documents by CAQH ID")
    @GetMapping("/lookup/{caqhId}")
    public CaqhProfile lookup(@PathVariable String caqhId) {
        return service.lookup(caqhId);
    }

    @Operation(summary = "Create a provider from a CAQH profile (practice required)")
    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public CaqhImportResponse importProvider(@Valid @RequestBody CaqhImportRequest req) {
        return service.importProvider(req);
    }
}
