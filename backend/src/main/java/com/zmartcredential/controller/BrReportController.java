package com.zmartcredential.controller;

import com.zmartcredential.dto.report.BrReportDtos.*;
import com.zmartcredential.common.PageResponse;
import com.zmartcredential.service.BrReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports")
public class BrReportController {

    private final BrReportService service;

    @GetMapping("/provider-credentialing")
    @Operation(summary = "Provider credentialing summary + per-provider document progress")
    public ProviderCredentialing providerCredentialing() {
        return service.providerCredentialing();
    }

    @GetMapping("/provider-roster")
    @Operation(summary = "Provider roster (all roster columns), searchable, paged, sortable")
    public PageResponse<RosterRow> roster(@RequestParam(required = false) String q,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "25") int size,
                                          @RequestParam(required = false) String sort) {
        return service.roster(q, page, size, sort);
    }

    @GetMapping("/provider-roster/export.csv")
    @Operation(summary = "Provider roster CSV export")
    public ResponseEntity<byte[]> rosterCsv(@RequestParam(required = false) String q,
                                            @RequestParam(required = false) String columns,
                                            @RequestParam(required = false) String sort) {
        return service.rosterCsv(q, columns, sort);
    }

    @GetMapping("/document-status")
    @Operation(summary = "Providers x document types status grid with totals")
    public DocumentStatus documentStatus(@RequestParam(required = false) String q) {
        return service.documentStatus(q);
    }

    @GetMapping("/document-collection")
    @Operation(summary = "Approved / applicable count per document type")
    public List<DocCollection> documentCollection() {
        return service.documentCollection();
    }

    @GetMapping("/payer-enrollment")
    @Operation(summary = "Payer enrollment status counts, TAT and 12-month trend")
    public PayerEnrollment payerEnrollment() {
        return service.payerEnrollment();
    }

    @GetMapping("/reappointments")
    @Operation(summary = "Reappointment tracking (date added + 730 days)")
    public Reappointments reappointments(@RequestParam(required = false) String q) {
        return service.reappointments(q);
    }
}
