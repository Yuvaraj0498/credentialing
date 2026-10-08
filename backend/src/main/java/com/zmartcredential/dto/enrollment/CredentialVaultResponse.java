package com.zmartcredential.dto.enrollment;

import java.time.LocalDateTime;

public record CredentialVaultResponse(boolean exists, String ciphertext, LocalDateTime updatedAt, Long updatedBy) {
}
