package com.zmartcredential.dto.auth;

import java.util.List;
import java.util.Map;

/**
 * Current user profile. {@code permissions} maps entity -> allowed actions for the user's role
 * (drives the frontend's can(action, entity) checks; the backend enforces the same matrix).
 */
public record MeResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String title,
        String role,
        Long orgId,
        String orgName,
        Long providerId,
        Map<String, List<String>> permissions) {
}
