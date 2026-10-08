package com.zmartcredential.dto.payer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/** password: required when creating; blank or null on update keeps the stored password. */
public record PayerCredentialRequest(
        @NotBlank(message = "Username is required")
        @Size(max = 200, message = "Username must be at most 200 characters")
        String username,
        @Size(max = 500, message = "Password must be at most 500 characters")
        String password,
        @Size(max = 500, message = "Portal URL must be at most 500 characters")
        String portalUrl,
        @Size(max = 60, message = "Payer provider ID must be at most 60 characters")
        String payerProviderId,
        @Size(max = 20, message = "Group TIN must be at most 20 characters")
        String groupTin,
        @Size(max = 1000, message = "Notes must be at most 1000 characters")
        String notes,
        /* organization logins: the providers that use this login (at least one); ignored for a provider's own login */
        List<Long> providerIds) {
}
