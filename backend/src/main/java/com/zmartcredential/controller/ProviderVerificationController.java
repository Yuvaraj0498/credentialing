package com.zmartcredential.controller;

import com.zmartcredential.dto.provider.ProviderVerificationDtos.DeferredIntegrationResponse;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.LetterRequest;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.LetterResponse;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.VerificationRequest;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.VerificationResponse;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.service.ProviderVerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Provider verification & letters")
@RestController
@RequiredArgsConstructor
public class ProviderVerificationController {

    private final ProviderVerificationService verificationService;
    private final AuthContext authContext;

    @Operation(summary = "Primary source verification history")
    @GetMapping("/api/providers/{id:\\d+}/verifications")
    public List<VerificationResponse> history(@PathVariable Long id) {
        return verificationService.history(id);
    }

    @Operation(summary = "Record a manual verification result")
    @PostMapping("/api/providers/{id:\\d+}/verifications")
    @ResponseStatus(HttpStatus.CREATED)
    public VerificationResponse record(@PathVariable Long id, @Valid @RequestBody VerificationRequest req) {
        return verificationService.record(id, req);
    }

    @Operation(summary = "Run automatic NPPES/OIG/SAM checks (deferred integration)")
    @PostMapping("/api/providers/{id:\\d+}/verifications/run")
    public DeferredIntegrationResponse run(@PathVariable Long id) {
        return verificationService.run(id);
    }

    @Operation(summary = "NPPES NPI lookup (deferred integration)")
    @GetMapping("/api/npi/{npi}")
    public DeferredIntegrationResponse npi(@PathVariable String npi) {
        authContext.requireStaff();
        if (!npi.matches("^\\d{10}$")) throw new BadRequestException("NPI must be 10 digits");
        return ProviderVerificationService.deferred();
    }

    @Operation(summary = "Generate an appointment / re-appointment / privileging letter")
    @PostMapping("/api/providers/{id:\\d+}/letters")
    @ResponseStatus(HttpStatus.CREATED)
    public LetterResponse generate(@PathVariable Long id, @Valid @RequestBody LetterRequest req) {
        return verificationService.generateLetter(id, req);
    }

    @Operation(summary = "Letters generated for a provider")
    @GetMapping("/api/providers/{id:\\d+}/letters")
    public List<LetterResponse> letters(@PathVariable Long id) {
        return verificationService.letters(id);
    }
}
