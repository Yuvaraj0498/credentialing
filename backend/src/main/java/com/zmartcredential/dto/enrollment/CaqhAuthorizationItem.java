package com.zmartcredential.dto.enrollment;

import java.time.LocalDateTime;

public record CaqhAuthorizationItem(
        Long payerId,
        String payerCode,
        String payerName,
        String color,
        String portalUrl,
        boolean authorized,
        LocalDateTime authorizedAt,
        LocalDateTime revokedAt,
        LocalDateTime lastDataPull) {
}
