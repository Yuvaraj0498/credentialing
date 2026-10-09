package com.zmartcredential.dto.organization;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/** Super admin → User Roles. */
public final class UserRoleDtos {

    private UserRoleDtos() {
    }

    public record UserRoleRequest(
            @NotBlank(message = "Role name is required")
            @Size(min = 2, max = 80, message = "2-80 characters")
            @Pattern(regexp = "^[A-Za-z][A-Za-z0-9 &/().,'-]*$", message = "Start with a letter; letters, digits, spaces and & / ( ) . , ' - only")
            String name,
            /* optional (not shown in the UI): staff (clerk, default) or read-only (auditor); admin and provider access
               belong to the built-in Admin and Provider roles only */
            @Pattern(regexp = "^$|clerk|auditor", message = "Roles can be staff (clerk) or read-only (auditor)")
            String accessLevel) {
    }

    /** userCount: users that currently have this role (a role in use cannot be deleted). */
    /** builtIn: the Admin role (org admins, from Create Admin) or the Provider role (provider logins) — kept. */
    public record UserRoleResponse(Long id, String name, String accessLevel, boolean active, long userCount, LocalDateTime createdAt,
                                   LocalDateTime updatedAt, boolean builtIn) {
    }

    public record UserRoleActiveRequest(@jakarta.validation.constraints.NotNull(message = "active is required") Boolean active) {
    }
}
