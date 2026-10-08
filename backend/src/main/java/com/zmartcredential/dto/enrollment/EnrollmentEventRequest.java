package com.zmartcredential.dto.enrollment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EnrollmentEventRequest(
        @NotBlank(message = "Type is required")
        @Pattern(regexp = "^(note|follow_up)$", message = "Type must be note or follow_up")
        String type,
        @NotBlank(message = "Note is required")
        @Size(max = 5000, message = "Note must be at most 5000 characters")
        String note) {
}
