package com.zmartcredential.dto.provider;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Primary source verification + appointment letters. */
public final class ProviderVerificationDtos {

    private ProviderVerificationDtos() {
    }

    public record DeferredIntegrationResponse(String integration, String message) {
    }

    public record VerificationRequest(
            @NotBlank(message = "Source is required")
            @Pattern(regexp = "npi|oig|sam|state_license", message = "Source must be npi, oig, sam or state_license")
            String source,
            @NotBlank(message = "Result is required")
            @Pattern(regexp = "clear|flagged", message = "Result must be clear or flagged") String status,
            @Size(max = 500, message = "At most 500 characters") String message) {
    }

    public record VerificationResponse(Long id, Long providerId, String source, String sourceLabel, String status,
                                       String message, LocalDateTime checkedAt, Long runBy, String runByName) {
    }

    public record LetterRequest(
            @NotBlank(message = "Letter type is required")
            @Pattern(regexp = "initial|recred|privileging", message = "Letter type must be initial, recred or privileging")
            String letterType,
            Long hospitalId,
            LocalDate effectiveDate) {
    }

    public record LetterProvider(Long id, String firstName, String lastName, String suffix, String npi,
                                 String specialty, String licenseNumber, String licenseState) {
    }

    public record LetterOrganization(Long id, String name, String address, String city, String state, String zip,
                                     String phone, String email) {
    }

    public record LetterHospital(Long id, String name, String city, String state) {
    }

    public record LetterResponse(Long id, String letterType, String title, String confirmationText,
                                 LetterProvider provider, LetterOrganization organization, LetterHospital hospital,
                                 LocalDate letterDate, LocalDate effectiveDate, LocalDate nextRecredDue,
                                 LocalDateTime generatedAt, Long generatedBy, String generatedByName) {
    }
}
