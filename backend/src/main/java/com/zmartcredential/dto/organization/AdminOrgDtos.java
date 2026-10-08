package com.zmartcredential.dto.organization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** Platform-admin organization management. */
public final class AdminOrgDtos {

    private AdminOrgDtos() {
    }

    public record AdminOrganizationResponse(
            Long id,
            String name,
            String orgType,
            String city,
            String state,
            String email,
            String phone,
            String status,
            boolean selfSignup,
            String inviteCode,
            long userCount,
            long providerCount,
            String packageCode,
            String packageName,
            String subscriptionStatus,
            LocalDateTime createdAt) {
    }

    public record FirstAdmin(
            @NotBlank(message = "First name is required") @Size(max = 100) String firstName,
            @NotBlank(message = "Last name is required") @Size(max = 100) String lastName,
            @NotBlank(message = "Email is required") @Email(message = "Valid email required") @Size(max = 255) String email,
            @NotBlank(message = "Password is required") @Size(min = 8, max = 100, message = "At least 8 characters") String password,
            @Size(max = 120) String title,
            @Size(max = 30) String phone) {
    }

    public record AdminOrganizationCreateRequest(
            @NotBlank(message = "Organization name is required") @Size(max = 200, message = "Max 200 characters") String name,
            @Size(max = 40) String orgType,
            @Pattern(regexp = "^$|[0-9]{9}", message = "Tax ID must be 9 digits") String taxId,
            @Size(max = 255) String website,
            @Size(max = 255) String address,
            @Size(max = 100) String city,
            @Pattern(regexp = "^$|[A-Z]{2}", message = "Select a state") String state,
            @Pattern(regexp = "^$|[0-9]{5}", message = "5 digits") String zip,
            @Size(max = 30) String phone,
            @Email(message = "Valid email required") @Size(max = 255) String email,
            String packageCode,
            @Min(value = 0, message = "Must be 0 or more") @Max(100000) Integer estimatedProviders,
            @Valid FirstAdmin admin) {
    }

    public record OrgStatusRequest(
            @NotBlank(message = "Status is required")
            @Pattern(regexp = "active|suspended", message = "Status must be active or suspended") String status) {
    }
}
