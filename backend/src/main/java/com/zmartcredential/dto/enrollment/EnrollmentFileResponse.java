package com.zmartcredential.dto.enrollment;

import java.time.LocalDateTime;

public record EnrollmentFileResponse(
        Long id,
        Long enrollmentId,
        String name,
        String fileType,
        String mimeType,
        Long sizeBytes,
        boolean hasFile,
        LocalDateTime uploadedAt,
        Long uploadedBy,
        String uploadedByName) {
}
