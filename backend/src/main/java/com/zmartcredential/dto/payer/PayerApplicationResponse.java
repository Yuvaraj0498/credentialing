package com.zmartcredential.dto.payer;

import com.zmartcredential.dto.enrollment.EnrollmentResponse;

import java.util.List;

public record PayerApplicationResponse(List<EnrollmentResponse> created, List<Skipped> skipped) {

    public record Skipped(Long providerId, String providerName, Long existingEnrollmentId, String reason) {
    }
}
