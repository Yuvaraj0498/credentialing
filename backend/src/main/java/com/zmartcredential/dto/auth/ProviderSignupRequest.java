package com.zmartcredential.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProviderSignupRequest(
        String suffix,
        @NotBlank(message = "First name is required") String firstName,
        @NotBlank(message = "Last name is required") String lastName,
        @NotBlank @Email(message = "Valid email required") String email,
        String phone,
        @NotBlank @Size(min = 8, message = "At least 8 characters") String password,
        @NotBlank @Pattern(regexp = "[0-9]{10}", message = "10 digits required") String npi,
        @NotBlank(message = "Specialty is required") String specialty,
        @Pattern(regexp = "[A-Z]{2}", message = "Select a state") String licenseState,
        String organizationCode) {
}
