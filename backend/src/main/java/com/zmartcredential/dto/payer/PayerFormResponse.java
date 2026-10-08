package com.zmartcredential.dto.payer;

public record PayerFormResponse(Long id, Long payerId, String code, String label, String description, Integer sortOrder) {
}
