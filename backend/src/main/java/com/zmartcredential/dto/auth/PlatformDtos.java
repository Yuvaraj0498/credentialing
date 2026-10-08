package com.zmartcredential.dto.auth;

import java.time.LocalDateTime;
import java.util.List;

/** Super admin: dashboard and the admins (organization accounts) created through "Create Admin". */
public final class PlatformDtos {

    private PlatformDtos() {
    }

    public record AdminSummary(Long userId, String name, String email, String phone, Long orgId, String orgName,
                               String orgStatus, String planName, long providerCount, long userCount,
                               boolean disabled, LocalDateTime createdAt) {
    }

    public record PlatformSummary(long organizations, long admins, long users, long providers, long userRoles,
                                  List<AdminSummary> recentAdmins) {
    }
}
