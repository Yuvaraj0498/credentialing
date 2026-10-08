package com.zmartcredential.dto.payer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PayerSubmissionUpdateRequest(
        @NotBlank(message = "Status is required")
        @Pattern(regexp = "^(submitted|accepted|rejected|failed)$", message = "Status must be submitted, accepted, rejected or failed")
        String status,
        @Size(max = 60, message = "Confirmation number must be at most 60 characters")
        String confirmationNumber,
        @Size(max = 500, message = "Message must be at most 500 characters")
        String message) {
}
