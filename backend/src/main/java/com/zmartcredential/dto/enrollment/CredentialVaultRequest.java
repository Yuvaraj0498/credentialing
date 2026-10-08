package com.zmartcredential.dto.enrollment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CredentialVaultRequest(
        @NotBlank(message = "Ciphertext is required")
        @Size(max = 1048576, message = "The vault is too large (max 1 MB)")
        @Pattern(regexp = "^[A-Za-z0-9+/=_-]+$", message = "Ciphertext must be base64 encoded")
        String ciphertext) {
}
