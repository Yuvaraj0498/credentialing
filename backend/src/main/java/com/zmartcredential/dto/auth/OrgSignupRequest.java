package com.zmartcredential.dto.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrgSignupRequest(
        @NotNull @Valid Org org,
        @NotNull @Valid Admin admin,
        @NotNull @Valid Plan plan,
        @NotNull @Valid PaymentMethod paymentMethod) {

    public record Org(
            @NotBlank(message = "Organization name is required") @Size(max = 200) String name,
            String type,
            @NotBlank @Pattern(regexp = "[0-9]{9}", message = "9 digits required") String taxId,
            @Size(max = 255) String website,
            @Size(max = 255) String address,
            @NotBlank(message = "City is required") String city,
            @Pattern(regexp = "[A-Z]{2}", message = "Select a state") String state,
            @NotBlank @Pattern(regexp = "[0-9]{5}", message = "5 digits required") String zip) {}

    public record Admin(
            @NotBlank(message = "First name is required") String firstName,
            @NotBlank(message = "Last name is required") String lastName,
            @NotBlank @Email(message = "Valid email required") String email,
            String phone,
            @NotBlank @Size(min = 8, message = "At least 8 characters") String password) {}

    public record Plan(
            @NotBlank String packageId,
            @Min(1) @Max(100000) int estimatedProviders) {}

    /** Card metadata only — the full card number and CVC never leave the browser. */
    public record PaymentMethod(
            @NotBlank String brand,
            @NotBlank @Pattern(regexp = "[0-9]{4}", message = "Invalid card") String last4,
            @NotBlank @Pattern(regexp = "[0-9]{2}/[0-9]{2}", message = "MM/YY format") String exp,
            @NotBlank(message = "Name on card is required") String billingName,
            @NotBlank @Pattern(regexp = "[0-9]{5}", message = "5 digits") String billingZip) {}
}
