package com.zmartcredential.dto.enrollment;

import java.util.Map;

public record EnrollmentSummaryResponse(
        long total,
        Map<String, Long> byStatus,
        long approved,
        long active,
        Integer avgTatDays) {
}
