package com.zmartcredential.dto.enrollment;

import java.time.LocalDateTime;

public record RosterUploadResponse(Long uploadId, Long payerId, String fileName, int rowCount, LocalDateTime uploadedAt) {
}
