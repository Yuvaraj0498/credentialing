package com.zmartcredential.dto.enrollment;

import java.time.LocalDate;
import java.util.List;

public record CaqhAuthorizationListResponse(
        Long providerId,
        String providerName,
        String caqhId,
        LocalDate caqhLastAttested,
        String caqhAttestationStatus,
        int authorizedCount,
        int capableCount,
        List<CaqhAuthorizationItem> items,
        List<NonCaqhPayer> nonCaqhPayers) {

    public record NonCaqhPayer(Long payerId, String payerName, String color, String portalUrl) {
    }
}
