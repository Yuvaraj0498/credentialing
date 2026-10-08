package com.zmartcredential.dto.organization;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** Users page (UsersView / UserFormModal). */
public final class UserDtos {

    private UserDtos() {
    }

    public record UserCreateRequest(
            @NotBlank(message = "Display name is required") @Size(max = 200, message = "Max 200 characters") String displayName,
            @Size(max = 100) String firstName,
            @Size(max = 100) String lastName,
            @NotBlank(message = "Username is required") @Size(min = 3, max = 150, message = "3-150 characters")
            @Pattern(regexp = "[A-Za-z0-9._@+-]+", message = "Letters, digits and . _ - @ + only") String username,
            @NotBlank(message = "Email is required") @Email(message = "Valid email required") @Size(max = 255) String email,
            @NotBlank(message = "Password is required") @Size(min = 8, max = 100, message = "At least 8 characters") String password,
            /* ignored: the access level comes from the chosen role (userRoleId) */
            String role,
            /* the role picked from the super admin's User Roles */
            @NotNull(message = "Role is required") Long userRoleId,
            @Size(max = 120, message = "Max 120 characters") String title,
            @Size(max = 30, message = "Max 30 characters") String phone,
            Long providerId,
            Boolean disabled) {
    }

    /** Users → Add User with the Provider role: the provider (same fields as Add Provider Manually) and their login. */
    public record UserWithProviderRequest(
            @NotBlank(message = "Username is required") @Size(min = 3, max = 150, message = "3-150 characters")
            @Pattern(regexp = "[A-Za-z0-9._@+-]+", message = "Letters, digits and . _ - @ + only") String username,
            @NotBlank(message = "Password is required") @Size(min = 8, max = 100, message = "At least 8 characters") String password,
            @NotNull(message = "Role is required") Long userRoleId,
            Boolean disabled,
            @NotNull(message = "Provider details are required") @jakarta.validation.Valid
            com.zmartcredential.dto.provider.ProviderDtos.ProviderCreateRequest provider) {
    }

    /** Username cannot be changed. Password is changed only when non-blank. */
    public record UserUpdateRequest(
            @NotBlank(message = "Display name is required") @Size(max = 200, message = "Max 200 characters") String displayName,
            @Size(max = 100) String firstName,
            @Size(max = 100) String lastName,
            @NotBlank(message = "Email is required") @Email(message = "Valid email required") @Size(max = 255) String email,
            @Size(max = 100, message = "Max 100 characters") String password,
            String role,
            @NotNull(message = "Role is required") Long userRoleId,
            @Size(max = 120, message = "Max 120 characters") String title,
            @Size(max = 30, message = "Max 30 characters") String phone,
            Long providerId,
            Boolean disabled) {
    }

    public record UserDisabledRequest(@NotNull(message = "disabled is required") Boolean disabled) {
    }

    public record UserResponse(
            Long id,
            Long orgId,
            String username,
            String email,
            String firstName,
            String lastName,
            String displayName,
            String title,
            String phone,
            String role,
            Long providerId,
            String providerName,
            boolean disabled,
            boolean selfSignup,
            boolean testData,
            LocalDateTime lastLoginAt,
            LocalDateTime createdAt,
            Long userRoleId,
            String userRoleName) {
    }

    public record UserDirectoryEntry(Long id, String displayName, String role, String title) {
    }
}
