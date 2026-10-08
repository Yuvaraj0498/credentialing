package com.zmartcredential.dto.enrollment;

public record CaqhAuthorizationSummaryItem(
        Long providerId,
        String providerName,
        String npi,
        String caqhId,
        int authorizedCount,
        int capableCount) {
}
