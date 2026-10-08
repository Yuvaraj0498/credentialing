package com.zmartcredential.dto.payer;

import java.time.LocalDateTime;
import java.util.List;

public record PayerCredentialMatrixResponse(
        List<PayerRef> payers,
        List<CredentialMeta> orgLevel,
        List<ProviderRow> providers,
        int providerCount,
        int credentialCount) {

    public record PayerRef(Long id, String code, String name, String color, String portalUrl, String apiSupport, Boolean caqhParticipating) {
    }

    /** providerIds: for organization logins, the providers the login is assigned to (empty for a provider's own login). */
    public record CredentialMeta(Long credentialId, Long payerId, String username, boolean hasPassword, LocalDateTime updatedAt,
                                 List<Long> providerIds) {
    }

    public record ProviderRow(Long providerId, String providerName, String npi, List<CredentialMeta> credentials) {
    }
}
