package com.zmartcredential.dto.enrollment;

import jakarta.validation.constraints.Size;

public record EnrollmentResubmitRequest(
        @Size(max = 2000, message = "Note must be at most 2000 characters")
        String note) {
}
