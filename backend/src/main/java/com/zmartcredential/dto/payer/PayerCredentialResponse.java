package com.zmartcredential.dto.payer;

import java.time.LocalDateTime;
import java.util.List;

/** Portal login metadata. The password is never included (see the reveal endpoint). */
public record PayerCredentialResponse(
        Long id,
        Long providerId,
        Long payerId,
        String payerName,
        String payerColor,
        String username,
        String portalUrl,
        String payerProviderId,
        String groupTin,
        String notes,
        boolean hasPassword,
        /* organization logins: the providers that use this login */
        List<Long> providerIds,
        LocalDateTime lastTestAt,
        Boolean lastTestOk,
        Long updatedBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
