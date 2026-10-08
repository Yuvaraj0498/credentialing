package com.zmartcredential.dto.enrollment;

import java.time.LocalDateTime;

public record EnrollmentEventResponse(
        Long id,
        Long enrollmentId,
        String type,
        LocalDateTime occurredAt,
        Long actorUserId,
        String actorLabel,
        String note,
        String confirmationNumber) {
}
