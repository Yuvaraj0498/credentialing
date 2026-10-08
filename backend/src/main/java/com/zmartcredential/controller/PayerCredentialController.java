package com.zmartcredential.controller;

import com.zmartcredential.dto.enrollment.CredentialVaultRequest;
import com.zmartcredential.dto.enrollment.CredentialVaultResponse;
import com.zmartcredential.dto.enrollment.IntegrationDeferredResponse;
import com.zmartcredential.dto.payer.PayerCredentialMatrixResponse;
import com.zmartcredential.dto.payer.PayerCredentialRequest;
import com.zmartcredential.dto.payer.PayerCredentialResponse;
import com.zmartcredential.dto.payer.PayerCredentialRevealResponse;
import com.zmartcredential.service.CredentialVaultService;
import com.zmartcredential.service.PayerCredentialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Payer Credentials")
@RestController
@RequiredArgsConstructor
public class PayerCredentialController {

    private final PayerCredentialService credentialService;
    private final CredentialVaultService vaultService;

    @Operation(summary = "Organization-level payer portal logins (no passwords)")
    @GetMapping("/api/payer-credentials")
    public List<PayerCredentialResponse> listOrg() {
        return credentialService.listOrgLevel();
    }

    @Operation(summary = "Providers x payers matrix of saved portal logins")
    @GetMapping("/api/payer-credentials/matrix")
    public PayerCredentialMatrixResponse matrix() {
        return credentialService.matrix();
    }

    @Operation(summary = "Create or update the organization-level login for a payer")
    @PutMapping("/api/payer-credentials/{payerId}")
    public PayerCredentialResponse saveOrg(@PathVariable Long payerId, @Valid @RequestBody PayerCredentialRequest req) {
        return credentialService.saveOrgLevel(payerId, req);
    }

    @Operation(summary = "Delete the organization-level login for a payer")
    @DeleteMapping("/api/payer-credentials/{payerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrg(@PathVariable Long payerId) {
        credentialService.deleteOrgLevel(payerId);
    }

    @Operation(summary = "Test a portal connection (deferred integration)")
    @PostMapping("/api/payer-credentials/{payerId}/test")
    public IntegrationDeferredResponse test(@PathVariable Long payerId) {
        return credentialService.test(payerId);
    }

    @Operation(summary = "Reveal a stored password (audited; admin/clerk or owning provider)")
    @PostMapping("/api/payer-credentials/{credentialId}/reveal")
    public PayerCredentialRevealResponse reveal(@PathVariable Long credentialId) {
        return credentialService.reveal(credentialId);
    }

    @Operation(summary = "A provider's payer portal logins (no passwords)")
    @GetMapping("/api/providers/{providerId}/payer-credentials")
    public List<PayerCredentialResponse> listProvider(@PathVariable Long providerId) {
        return credentialService.listForProvider(providerId);
    }

    @Operation(summary = "Create or update a provider's login for a payer")
    @PutMapping("/api/providers/{providerId}/payer-credentials/{payerId}")
    public PayerCredentialResponse saveProvider(@PathVariable Long providerId, @PathVariable Long payerId,
                                                @Valid @RequestBody PayerCredentialRequest req) {
        return credentialService.saveForProvider(providerId, payerId, req);
    }

    @Operation(summary = "Delete a provider's login for a payer")
    @DeleteMapping("/api/providers/{providerId}/payer-credentials/{payerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProvider(@PathVariable Long providerId, @PathVariable Long payerId) {
        credentialService.deleteForProvider(providerId, payerId);
    }

    @Operation(summary = "Get the zero-knowledge vault ciphertext")
    @GetMapping("/api/credential-vault")
    public CredentialVaultResponse getVault() {
        return vaultService.get();
    }

    @Operation(summary = "Store the vault ciphertext (encrypted in the browser)")
    @PutMapping("/api/credential-vault")
    public CredentialVaultResponse saveVault(@Valid @RequestBody CredentialVaultRequest req) {
        return vaultService.save(req.ciphertext());
    }

    @Operation(summary = "Reset (delete) the vault — org_admin/platform_admin only")
    @DeleteMapping("/api/credential-vault")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVault() {
        vaultService.delete();
    }
}
