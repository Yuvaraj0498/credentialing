package com.zmartcredential.dto.payer;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PayerRequest(
        @NotBlank(message = "Code is required")
        @Size(max = 40, message = "Code must be at most 40 characters")
        @Pattern(regexp = "^[a-z0-9_]+$", message = "Code may only contain lowercase letters, digits and underscores")
        String code,
        @NotBlank(message = "Name is required")
        @Size(max = 120, message = "Name must be at most 120 characters")
        String name,
        @Size(max = 200, message = "Full name must be at most 200 characters")
        String fullName,
        @NotBlank(message = "Category is required")
        @Size(max = 40, message = "Category must be at most 40 characters")
        String category,
        @Size(max = 40, message = "Payer type must be at most 40 characters")
        String payerType,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Color must be a hex value such as #1d4ed8")
        String color,
        @Size(max = 150, message = "Application form must be at most 150 characters")
        String appForm,
        @Pattern(regexp = "^(caqh|availity|pecos|portal)$", message = "Integration must be caqh, availity, pecos or portal")
        String integration,
        @Pattern(regexp = "^(full|partial|portal|manual)$", message = "API support must be full, partial, portal or manual")
        String apiSupport,
        Boolean caqhParticipating,
        @Size(max = 500, message = "Portal URL must be at most 500 characters")
        String portalUrl,
        @Min(value = 0, message = "Average turnaround cannot be negative")
        @Max(value = 1000, message = "Average turnaround must be at most 1000 days")
        Integer avgTatDays,
        @Pattern(regexp = "^(medicare|medicaid|commercial)$", message = "Pricing category must be medicare, medicaid or commercial")
        String pricingCategory,
        @DecimalMin(value = "0.10", message = "Pricing multiplier must be at least 0.10")
        @DecimalMax(value = "9.99", message = "Pricing multiplier must be at most 9.99")
        BigDecimal pricingMult,
        @Min(value = 1, message = "Re-credentialing cycle must be at least 1 month")
        @Max(value = 120, message = "Re-credentialing cycle must be at most 120 months")
        Integer recredCycleMonths,
        Integer sortOrder,
        Boolean active) {
}
