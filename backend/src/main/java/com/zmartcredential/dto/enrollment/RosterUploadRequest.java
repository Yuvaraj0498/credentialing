package com.zmartcredential.dto.enrollment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RosterUploadRequest(
        @Size(max = 255, message = "File name must be at most 255 characters")
        String fileName,
        @NotEmpty(message = "The roster file has no rows")
        @Size(max = 20000, message = "At most 20000 roster rows per upload")
        List<@Valid Entry> entries) {

    public record Entry(
            @Pattern(regexp = "^([0-9]{10})?$", message = "NPI must be 10 digits")
            String npi,
            @Size(max = 100, message = "First name must be at most 100 characters")
            String firstName,
            @Size(max = 100, message = "Last name must be at most 100 characters")
            String lastName,
            @Size(max = 120, message = "Specialty must be at most 120 characters")
            String specialty) {
    }
}
