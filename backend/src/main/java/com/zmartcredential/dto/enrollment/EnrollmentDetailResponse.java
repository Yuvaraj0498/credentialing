package com.zmartcredential.dto.enrollment;

import java.util.List;

public record EnrollmentDetailResponse(
        EnrollmentResponse enrollment,
        List<EnrollmentFileResponse> files,
        List<EnrollmentEventResponse> events) {
}
