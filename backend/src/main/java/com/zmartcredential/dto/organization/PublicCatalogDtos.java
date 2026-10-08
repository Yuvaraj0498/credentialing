package com.zmartcredential.dto.organization;

import java.math.BigDecimal;
import java.util.List;

/** Unauthenticated sign-up helpers. */
public final class PublicCatalogDtos {

    private PublicCatalogDtos() {
    }

    /** Caps are null when unlimited. {@code id} equals {@code code} (sign-up sends it as plan.packageId). */
    public record PublicPackage(
            String id,
            String code,
            String name,
            BigDecimal basePrice,
            BigDecimal perProvider,
            String color,
            String colorSoft,
            boolean recommended,
            Integer providerCap,
            Integer payerCap,
            Integer aiUploadsPerMonth,
            String primarySupport,
            int sortOrder,
            List<String> features,
            List<String> notIncluded) {
    }

    public record PublicState(String code, String name) {
    }

    public record InviteCodeOrg(String orgName) {
    }
}
