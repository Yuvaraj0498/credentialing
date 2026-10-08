package com.zmartcredential.dto.enrollment;

import jakarta.validation.constraints.NotNull;

public record CaqhAuthorizationUpdateRequest(
        @NotNull(message = "authorized is required")
        Boolean authorized) {
}
