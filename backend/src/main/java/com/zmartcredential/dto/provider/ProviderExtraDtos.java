package com.zmartcredential.dto.provider;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** More provider details (Add Provider, Edit Provider, secure link). Every field is optional. */
public final class ProviderExtraDtos {

    private ProviderExtraDtos() {
    }

    /** Sent by the forms: replaces the stored values (blank clears), except SSN / PECOS password (blank keeps). */
    public record ProviderExtraInput(
            @Size(max = 20, message = "At most 20 characters") String taxonomyCode,
            @Size(max = 200, message = "At most 200 characters") String groupName,
            @Pattern(regexp = "^$|^\\d{10}$", message = "Group NPI must be 10 digits") String groupNpi,
            @Pattern(regexp = "^$|^\\d{2}-?\\d{7}$", message = "Tax ID must be 9 digits") String taxId,
            @Size(max = 255, message = "At most 255 characters") String homeAddress,
            @Size(max = 100, message = "At most 100 characters") String homeCity,
            @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Use the 2-letter state code") String homeState,
            @Pattern(regexp = "^$|^\\d{5}(-?\\d{4})?$", message = "ZIP must be 5 or 9 digits") String homeZip,
            @Size(max = 30, message = "At most 30 characters") String medicarePhone,
            @Size(max = 40, message = "At most 40 characters") String medicaidNumber,
            @Size(max = 40, message = "At most 40 characters") String medicarePtan,
            @Size(max = 40, message = "At most 40 characters") String drivingLicense,
            @Size(max = 200, message = "At most 200 characters") String practiceLegalName,
            @Size(max = 200, message = "At most 200 characters") String practiceDbaName,
            @Size(max = 150, message = "At most 150 characters") String practiceOwnerName,
            @Size(max = 150, message = "At most 150 characters") String practiceManagerName,
            @Size(max = 30, message = "At most 30 characters") String practiceManagerContact,
            @Size(max = 255, message = "At most 255 characters") String practiceAddress,
            @Size(max = 100, message = "At most 100 characters") String practiceCity,
            @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Use the 2-letter state code") String practiceState,
            @Pattern(regexp = "^$|^\\d{5}(-?\\d{4})?$", message = "ZIP must be 5 or 9 digits") String practiceZip,
            @Size(max = 30, message = "At most 30 characters") String practicePhone,
            @Size(max = 30, message = "At most 30 characters") String practiceFax,
            @Email(message = "Enter a valid email address") @Size(max = 255) String practiceEmail,
            LocalDate practiceStartDate,
            @Size(max = 255, message = "At most 255 characters") String officeHours,
            @Size(max = 255, message = "At most 255 characters") String billingAddress,
            @Size(max = 100, message = "At most 100 characters") String billingCity,
            @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Use the 2-letter state code") String billingState,
            @Pattern(regexp = "^$|^\\d{5}(-?\\d{4})?$", message = "ZIP must be 5 or 9 digits") String billingZip,
            @Size(max = 30, message = "At most 30 characters") String billingPhone,
            @Size(max = 30, message = "At most 30 characters") String billingFax,
            @Email(message = "Enter a valid email address") @Size(max = 255) String billingEmail,
            @Size(max = 150, message = "At most 150 characters") String billingContactPerson,
            /* blank keeps the stored SSN */ @Pattern(regexp = "^$|^\\d{3}-?\\d{2}-?\\d{4}$", message = "SSN must be 9 digits") String ssn,
            /* blank keeps the stored password */ @Size(max = 200, message = "At most 200 characters") String pecosPassword) {
    }

    /** Shown on the provider's page: the SSN only as its last 4 digits, the PECOS password never. */
    public record ProviderExtraView(
            String taxonomyCode,
            String groupName,
            String groupNpi,
            String taxId,
            String homeAddress,
            String homeCity,
            String homeState,
            String homeZip,
            String medicarePhone,
            String medicaidNumber,
            String medicarePtan,
            String drivingLicense,
            String practiceLegalName,
            String practiceDbaName,
            String practiceOwnerName,
            String practiceManagerName,
            String practiceManagerContact,
            String practiceAddress,
            String practiceCity,
            String practiceState,
            String practiceZip,
            String practicePhone,
            String practiceFax,
            String practiceEmail,
            LocalDate practiceStartDate,
            String officeHours,
            String billingAddress,
            String billingCity,
            String billingState,
            String billingZip,
            String billingPhone,
            String billingFax,
            String billingEmail,
            String billingContactPerson,
            boolean hasSsn,
            String ssnLast4,
            boolean hasPecosPassword) {
    }
}
