package com.zmartcredential.controller;

import com.zmartcredential.dto.payer.FormMappingResponse;
import com.zmartcredential.dto.payer.PayerApplicationRequest;
import com.zmartcredential.dto.payer.PayerApplicationResponse;
import com.zmartcredential.service.PayerApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Payer Applications")
@RestController
@RequiredArgsConstructor
public class PayerApplicationController {

    private final PayerApplicationService service;

    @Operation(summary = "Start applications: one draft enrollment per selected provider")
    @PostMapping("/api/payer-applications")
    @ResponseStatus(HttpStatus.CREATED)
    public PayerApplicationResponse start(@Valid @RequestBody PayerApplicationRequest req) {
        return service.start(req);
    }

    @Operation(summary = "Field mapping of a payer form for a provider")
    @GetMapping("/api/payer-forms/{formId}/mapping")
    public FormMappingResponse formMapping(@PathVariable Long formId, @RequestParam Long providerId) {
        return service.mappingForPayer(null, formId, providerId);
    }

    @Operation(summary = "Field mapping for a payer (default template when the payer has no specific form)")
    @GetMapping("/api/payers/{payerId}/form-mapping")
    public FormMappingResponse payerMapping(@PathVariable Long payerId, @RequestParam Long providerId,
                                            @RequestParam(required = false) Long formId) {
        return service.mappingForPayer(payerId, formId, providerId);
    }
}
