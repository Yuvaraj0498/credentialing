package com.zmartcredential.dto.organization;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrganizationUpdateRequest(
        @NotBlank(message = "Organization name is required") @Size(max = 200, message = "Max 200 characters") String name,
        @Size(max = 40) String orgType,
        @Pattern(regexp = "^$|[0-9]{9}", message = "Tax ID must be 9 digits") String taxId,
        @Size(max = 255, message = "Max 255 characters") String website,
        @Size(max = 255, message = "Max 255 characters") String address,
        @Size(max = 100, message = "Max 100 characters") String city,
        @Pattern(regexp = "^$|[A-Z]{2}", message = "Select a state") String state,
        @Pattern(regexp = "^$|[0-9]{5}(-[0-9]{4})?", message = "ZIP must be 5 digits") String zip,
        @Size(max = 30, message = "Max 30 characters") String phone,
        @Email(message = "Valid email required") @Size(max = 255) String email) {
}
