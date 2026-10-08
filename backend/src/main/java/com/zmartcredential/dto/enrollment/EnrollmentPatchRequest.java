package com.zmartcredential.dto.enrollment;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Partial update: null fields are left unchanged; use the clear* flags to empty a field. */
public record EnrollmentPatchRequest(
        @Pattern(regexp = "^(draft|in_progress|submitted|approved|needs_attention|on_hold|terminated)$",
                message = "Status must be draft, in_progress, submitted, approved, needs_attention, on_hold or terminated")
        String status,
        LocalDate submittedDate,
        LocalDate effectiveDate,
        Long assignedUserId,
        @Size(max = 5000, message = "Notes must be at most 5000 characters")
        String notes,
        Boolean clearSubmittedDate,
        Boolean clearEffectiveDate,
        Boolean clearAssignedUser) {
}
