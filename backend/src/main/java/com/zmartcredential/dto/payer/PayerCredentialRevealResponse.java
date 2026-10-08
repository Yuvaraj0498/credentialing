package com.zmartcredential.dto.payer;

/** portalUrl: the login's own portal address, else the payer's. */
public record PayerCredentialRevealResponse(Long credentialId, Long providerId, Long payerId, String username, String password,
                                            String portalUrl, String payerProviderId, String groupTin) {
}
