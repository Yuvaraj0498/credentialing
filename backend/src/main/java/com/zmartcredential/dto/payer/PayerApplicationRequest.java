package com.zmartcredential.dto.payer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PayerApplicationRequest(
        @NotBlank(message = "Choose an application type")
        @Pattern(regexp = "^(initial|recred|update|terminate)$",
                message = "Application type must be initial, recred, update or terminate")
        String applicationType,
        @NotNull(message = "Choose a payer")
        Long payerId,
        Long formId,
        @NotEmpty(message = "Select at least one provider")
        @Size(max = 500, message = "At most 500 providers per batch")
        List<Long> providerIds) {
}
