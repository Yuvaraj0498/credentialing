package com.zmartcredential.dto.billing;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/** Pricing matrix responses and platform-admin edit requests. */
public final class BrPricingDtos {

    private BrPricingDtos() {
    }

    public record StateDto(String code, String name, BigDecimal mult, String region) {
    }

    public record BaseRateDto(String category, String serviceType, BigDecimal amount) {
    }

    public record PricingPayerDto(Long id, String code, String name, String color, String pricingCategory,
                                  BigDecimal pricingMult) {
    }

    public record PriceCell(Long payerId, BigDecimal price) {
    }

    public record MatrixRow(String code, String name, String region, BigDecimal mult, List<PriceCell> prices,
                            BigDecimal minPrice, BigDecimal maxPrice) {
    }

    public record Matrix(String serviceType, List<PricingPayerDto> payers, List<MatrixRow> rows, int totalStates) {
    }

    public record Quote(String requestedState, String stateCode, boolean stateFallback, Long payerId, String payerName,
                        String category, String serviceType, BigDecimal baseRate, BigDecimal stateMult,
                        BigDecimal payerMult, BigDecimal price) {
    }

    public record UpdateStateRequest(
            @NotNull(message = "Multiplier is required")
            @DecimalMin(value = "0.10", message = "Multiplier must be at least 0.10")
            @DecimalMax(value = "9.99", message = "Multiplier must be at most 9.99")
            @Digits(integer = 1, fraction = 2, message = "Use at most 2 decimal places")
            BigDecimal mult) {
    }

    public record UpdateBaseRateRequest(
            @NotNull(message = "Amount is required")
            @DecimalMin(value = "0.00", message = "Amount cannot be negative")
            @DecimalMax(value = "99999.99", message = "Amount is too large")
            @Digits(integer = 5, fraction = 2, message = "Use at most 2 decimal places")
            BigDecimal amount) {
    }
}
