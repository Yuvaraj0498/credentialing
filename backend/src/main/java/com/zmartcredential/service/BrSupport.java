package com.zmartcredential.service;

import com.zmartcredential.entity.AuditLog;
import com.zmartcredential.entity.Enrollment;
import com.zmartcredential.entity.Invoice;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.repository.AuditLogRepository;
import com.zmartcredential.security.AuthContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

/** Shared helpers for the billing-reports module (dashboard, reports, billing, pricing). */
@Component
@RequiredArgsConstructor
public class BrSupport {

    public static final Set<String> ACTIVE_ENROLLMENT = Set.of("in_progress", "submitted");
    public static final Set<String> CLOSED_INVOICE = Set.of("paid", "void");

    private final AuditLogRepository auditLogRepository;
    private final AuthContext authContext;

    public static LocalDate today() {
        return LocalDate.now();
    }

    public static String providerName(Provider p) {
        return ((p.getFirstName() == null ? "" : p.getFirstName()) + " "
                + (p.getLastName() == null ? "" : p.getLastName())).trim();
    }

    /** Provider status -> enrollment-style StatusPill key used by the prototype. */
    public static String statusKey(String providerStatus) {
        if (providerStatus == null) return "in_progress";
        return switch (providerStatus) {
            case "active" -> "approved";
            case "draft" -> "draft";
            case "on_hold" -> "on_hold";
            case "terminated" -> "terminated";
            default -> "in_progress";
        };
    }

    /** Turnaround days: stored tat_days, else submitted -> effective date difference; null when unknown. */
    public static Integer tatDays(Enrollment e) {
        if (e.getTatDays() != null && e.getTatDays() > 0) return e.getTatDays();
        if (e.getSubmittedDate() != null && e.getEffectiveDate() != null) {
            long d = ChronoUnit.DAYS.between(e.getSubmittedDate(), e.getEffectiveDate());
            return d > 0 ? (int) d : null;
        }
        return null;
    }

    public static Integer avg(List<Integer> values) {
        if (values.isEmpty()) return null;
        return (int) Math.round(values.stream().mapToInt(Integer::intValue).average().orElse(0));
    }

    /** 'due' invoices past their due date are reported as 'overdue'. */
    public static String effectiveStatus(Invoice i) {
        if ("due".equals(i.getStatus()) && i.getDueDate() != null && i.getDueDate().isBefore(today())) {
            return "overdue";
        }
        return i.getStatus();
    }

    public void audit(Long orgId, String entity, Long entityId, String action, String summary) {
        AuditLog log = new AuditLog();
        log.setOrgId(orgId);
        log.setUserId(authContext.userId());
        log.setEntity(entity);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setSummary(summary != null && summary.length() > 500 ? summary.substring(0, 500) : summary);
        auditLogRepository.save(log);
    }

    // ---------- CSV ----------

    public static String csvCell(Object v) {
        if (v == null) return "";
        String s = v.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    public static ResponseEntity<byte[]> csv(String filename, List<String> headers, List<List<Object>> rows) {
        StringBuilder sb = new StringBuilder("﻿");
        sb.append(String.join(",", headers.stream().map(BrSupport::csvCell).toList())).append("\r\n");
        for (List<Object> row : rows) {
            sb.append(String.join(",", row.stream().map(BrSupport::csvCell).toList())).append("\r\n");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }
}
