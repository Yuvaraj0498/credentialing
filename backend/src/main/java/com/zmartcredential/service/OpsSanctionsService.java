package com.zmartcredential.service;

import com.zmartcredential.dto.credentialing.OpsHubDtos.DeferredResponse;
import com.zmartcredential.dto.credentialing.OpsHubDtos.SanctionsResponse;
import com.zmartcredential.dto.credentialing.OpsHubDtos.SanctionsRow;
import com.zmartcredential.dto.credentialing.OpsHubDtos.SanctionsStats;
import com.zmartcredential.dto.credentialing.OpsHubDtos.SourceCheck;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.VerificationCheck;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.VerificationCheckRepository;
import com.zmartcredential.security.AuthContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Sanctions / exclusion monitoring derived from verification_check rows (SanctionsMonitoringView). */
@Service
@RequiredArgsConstructor
public class OpsSanctionsService {

    public static final List<String> SOURCES = List.of("npi", "oig", "sam", "state_license");
    public static final int DUE_SOON_DAYS = 10;

    private final VerificationCheckRepository checkRepository;
    private final OrganizationRepository organizationRepository;
    private final OpsLookupService lookup;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public SanctionsResponse monitoring(String q) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        int interval = organizationRepository.findById(orgId).map(Organization::getSanctionsIntervalDays).orElse(30);
        LocalDate today = LocalDate.now();

        // latest check per provider per source
        Map<Long, Map<String, VerificationCheck>> latest = new HashMap<>();
        for (VerificationCheck vc : checkRepository.findByOrgId(orgId)) {
            String source = normalizeSource(vc.getSource());
            Map<String, VerificationCheck> m = latest.computeIfAbsent(vc.getProviderId(), k -> new HashMap<>());
            VerificationCheck prev = m.get(source);
            if (prev == null || prev.getCheckedAt().isBefore(vc.getCheckedAt())) m.put(source, vc);
        }

        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase(Locale.ROOT);
        List<SanctionsRow> rows = new ArrayList<>();
        for (Provider p : lookup.providersById(orgId).values()) {
            if (needle != null) {
                String hay = (OpsLookupService.plainName(p) + " " + (p.getNpi() == null ? "" : p.getNpi())).toLowerCase(Locale.ROOT);
                if (!hay.contains(needle)) continue;
            }
            Map<String, VerificationCheck> m = latest.getOrDefault(p.getId(), Map.of());
            Map<String, SourceCheck> checks = new LinkedHashMap<>();
            LocalDateTime lastChecked = null;
            List<String> flags = new ArrayList<>();
            for (String source : SOURCES) {
                VerificationCheck vc = m.get(source);
                checks.put(source, vc == null ? null : new SourceCheck(vc.getStatus(), vc.getMessage(), vc.getCheckedAt()));
                if (vc != null) {
                    if (lastChecked == null || lastChecked.isBefore(vc.getCheckedAt())) lastChecked = vc.getCheckedAt();
                    if ("flagged".equals(vc.getStatus())) flags.add(vc.getMessage() != null ? vc.getMessage() : source.toUpperCase(Locale.ROOT) + " check flagged");
                }
            }
            String status = lastChecked == null ? "never" : (flags.isEmpty() ? "clear" : "flagged");
            LocalDate nextDue = lastChecked == null ? null : lastChecked.toLocalDate().plusDays(interval);
            Long daysUntil = nextDue == null ? null : ChronoUnit.DAYS.between(today, nextDue);
            boolean overdue = daysUntil != null && daysUntil < 0;
            boolean dueSoon = daysUntil != null && daysUntil >= 0 && daysUntil <= DUE_SOON_DAYS;
            rows.add(new SanctionsRow(p.getId(), OpsLookupService.plainName(p), p.getNpi(), checks, lastChecked, nextDue,
                    daysUntil, status, dueSoon, overdue, flags));
        }
        rows.sort(Comparator.comparing(SanctionsRow::name, String.CASE_INSENSITIVE_ORDER));
        SanctionsStats stats = new SanctionsStats(rows.size(),
                rows.stream().filter(r -> "clear".equals(r.status())).count(),
                rows.stream().filter(r -> "flagged".equals(r.status())).count(),
                rows.stream().filter(r -> "never".equals(r.status())).count(),
                rows.stream().filter(SanctionsRow::dueSoon).count(),
                rows.stream().filter(SanctionsRow::overdue).count());
        return new SanctionsResponse(interval, stats, rows);
    }

    public DeferredResponse runAll() {
        lookup.requireWriter();
        return new DeferredResponse("deferred", "Automatic OIG / SAM / NPPES monitoring will be available in a later phase.");
    }

    private static String normalizeSource(String s) {
        if (s == null) return "unknown";
        String v = s.toLowerCase(Locale.ROOT);
        return switch (v) {
            case "statelicense", "state", "state_board", "license" -> "state_license";
            default -> v;
        };
    }
}
