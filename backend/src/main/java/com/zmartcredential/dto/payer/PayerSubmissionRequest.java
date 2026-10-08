package com.zmartcredential.dto.payer;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PayerSubmissionRequest(
        @NotNull(message = "Provider is required")
        Long providerId,
        @NotEmpty(message = "Select at least one payer")
        @Size(max = 100, message = "At most 100 payers per submission")
        List<Long> payerIds,
        @Pattern(regexp = "^(api|portal|manual|fax)$", message = "Method must be api, portal, manual or fax")
        String method) {
}
