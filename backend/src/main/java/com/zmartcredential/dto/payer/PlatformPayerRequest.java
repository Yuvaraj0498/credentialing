package com.zmartcredential.dto.payer;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Super admin → Payers → Add / Edit Payer. */
public record PlatformPayerRequest(
        @NotBlank(message = "Payer name is required") @Size(max = 120, message = "At most 120 characters")
        String name,
        @NotBlank(message = "Insurance company name is required") @Size(max = 200, message = "At most 200 characters")
        String fullName,
        @NotBlank(message = "Payer category is required") @Size(max = 40, message = "At most 40 characters")
        String category,
        @NotNull(message = "Avg TAT is required") @Min(value = 1, message = "At least 1 day") @Max(value = 365, message = "At most 365 days")
        Integer avgTatDays,
        @NotBlank(message = "Integration is required")
        @Pattern(regexp = "^(caqh|availity|pecos|portal)$", message = "Choose an integration")
        String integration,
        @NotBlank(message = "Form is required") @Size(max = 150, message = "At most 150 characters")
        String appForm,
        @NotNull(message = "Choose whether a portal is available")
        Boolean portalAvailable,
        /* the payer's provider portal login page (required; checked in PayerService) */
        @Size(max = 500, message = "At most 500 characters")
        @Pattern(regexp = "^$|^https?://\\S+$", message = "Enter a full address starting with https://")
        String portalUrl,
        /* optional: data:image/png|jpeg|webp|svg+xml;base64,… (about 500 KB at most) */
        @Size(max = 700000, message = "The image must be 500 KB or smaller")
        @Pattern(regexp = "^$|^data:image/(png|jpeg|webp|svg\\+xml);base64,[A-Za-z0-9+/=]+$", message = "Choose a PNG, JPG, WEBP or SVG image")
        String logo) {
}
