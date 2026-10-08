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
            /* optional (not shown in the UI): built-in role behind the role; new roles default to staff */
            @Pattern(regexp = "^$|org_admin|clerk|auditor|provider", message = "Unknown access level")
            String accessLevel) {
    }

    /** userCount: users that currently have this role (a role in use cannot be deleted). */
    public record UserRoleResponse(Long id, String name, String accessLevel, boolean active, long userCount, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record UserRoleActiveRequest(@jakarta.validation.constraints.NotNull(message = "active is required") Boolean active) {
    }
}
