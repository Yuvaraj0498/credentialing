package com.zmartcredential.dto.provider;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class ProviderInviteDtos {

    private ProviderInviteDtos() {
    }

    /** Optional client/practice/location re-assign the provider before the link is sent. */
    public record ProviderInviteRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address")
            @Size(max = 255) String email,
            Long clientId,
            Long practiceId,
            Long locationId) {
    }

    public record ProviderInviteNewRequest(
            @NotBlank(message = "First name is required") @Size(max = 80, message = "At most 80 characters") String firstName,
            @NotBlank(message = "Last name is required") @Size(max = 80, message = "At most 80 characters") String lastName,
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address")
            @Size(max = 255) String email,
            Long clientId,
            @NotNull(message = "Pick a practice to continue") Long practiceId,
            @NotNull(message = "Pick a location to continue") Long locationId,
            /* optional */
            @Pattern(regexp = "^$|^\\d{6,10}$", message = "CAQH ID must be 6-10 digits") String caqhId) {
    }

    /**
     * Admin "Secure Links" row. status: pending | accessed | submitted | expired | locked | replaced.
     * The PIN is shown to staff so they can re-share it (email delivery is deferred).
     */
    public record SecureLinkItem(Long id, Long providerId, String providerName, String email, String pin, String status,
                                 int attempts, int maxAttempts, String uploadUrl, LocalDateTime createdAt,
                                 LocalDateTime expiresAt, LocalDateTime accessedAt, LocalDateTime submittedAt) {
    }

    /** Pre-PIN state of a link. state: active | expired | locked | submitted | replaced. */
    public record PublicLinkStatus(String state, String firstName, String organizationName, LocalDateTime expiresAt,
                                   int attemptsRemaining, LocalDateTime submittedAt) {
    }

    /** Current provider values, used to pre-fill the portal's profile step. */
    public record PublicProfile(String npi, String caqhId, String suffix, String specialty, String phone,
                                LocalDate dateOfBirth, String licenseNumber, String licenseState,
                                LocalDate licenseExpires, String deaNumber, LocalDate deaExpires) {
    }

    public record PublicProfileRequest(
            @NotBlank(message = "PIN is required") @Pattern(regexp = "^\\d{6}$", message = "PIN must be 6 digits")
            String pin,
            @NotBlank(message = "NPI is required") @Pattern(regexp = "^\\d{10}$", message = "NPI must be 10 digits")
            String npi,
            @Pattern(regexp = "^$|^\\d{6,10}$", message = "CAQH ID must be 6-10 digits") String caqhId,
            @Size(max = 10, message = "At most 10 characters") String suffix,
            @Size(max = 120, message = "At most 120 characters") String specialty,
            @Size(max = 30, message = "At most 30 characters") String phone,
            LocalDate dateOfBirth,
            @NotBlank(message = "License number is required") @Size(max = 40, message = "At most 40 characters")
            String licenseNumber,
            @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Use a 2-letter state") String licenseState,
            LocalDate licenseExpires,
            @Size(max = 20, message = "At most 20 characters") String deaNumber,
            LocalDate deaExpires,
            @Size(max = 100, message = "At most 100 characters") String caqhUsername,
            @Size(max = 200, message = "At most 200 characters") String caqhPassword,
            Boolean pecosAccessGranted,
            @Size(max = 100, message = "At most 100 characters") String pecosUsername) {
    }

    /** emailStatus: sent | failed (emailError says why) | queued (sending disabled, only logged). */
    public record ProviderInviteResponse(Long inviteId, Long providerId, String providerName, String email,
                                         String pin, LocalDateTime expiresAt, String uploadUrl, String emailStatus,
                                         String emailError) {
    }

    public record PublicInviteVerifyRequest(
            @NotBlank(message = "PIN is required") @Pattern(regexp = "^\\d{6}$", message = "PIN must be 6 digits")
            String pin) {
    }

    public record PublicMissingDocument(String docType, String label, boolean critical, boolean expires,
                                        String status) {
    }

    public record PublicInviteInfo(String providerName, String organizationName, String email,
                                   List<PublicMissingDocument> missingDocuments, LocalDateTime expiresAt,
                                   String firstName, String lastName, PublicProfile profile) {
    }

    public record PublicUploadedFile(String fileName, String docType, String label, LocalDate expiresAt) {
    }

    public record PublicUploadResult(List<PublicUploadedFile> uploaded, List<PublicMissingDocument> missingDocuments) {
    }
}
