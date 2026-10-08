package com.zmartcredential.security;

/** Identity of the authenticated user, rebuilt from the JWT claims on every request. */
public record AuthPrincipal(
        Long userId,
        Long orgId,
        Role role,
        Long providerId,
        String username,
        String displayName) {

    public boolean isPlatformAdmin() {
        return role == Role.PLATFORM_ADMIN;
    }

    public boolean isProvider() {
        return role == Role.PROVIDER;
    }
}
