package com.zmartcredential.dto.payer;

import java.time.LocalDateTime;
import java.util.List;

public record FormMappingResponse(
        Long enrollmentId,
        String applicationType,
        Payer payer,
        Form form,
        Provider provider,
        Ref practice,
        Ref location,
        List<Section> sections,
        Stats stats,
        LocalDateTime generatedAt) {

    public record Payer(Long id, String code, String name, String fullName, String color) {
    }

    /** id null + code "default" = no specific form; the label falls back to payer.appForm. */
    public record Form(Long id, String code, String label, String description, boolean usesDefaultTemplate) {
    }

    public record Provider(Long id, String fullName, String npi, String specialty, String caqhId) {
    }

    public record Ref(Long id, String name) {
    }

    public record Section(String name, String completion, int filled, int total, List<Field> fields) {
    }

    public record Field(Long fieldId, String label, String value, String confidence, String configuredConfidence, String mapsTo) {
    }

    public record Stats(int total, int high, int medium, int low, int completePct) {
    }
}
