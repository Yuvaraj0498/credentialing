package com.zmartcredential.service;

import com.zmartcredential.dto.enrollment.RecredScheduleResponse;
import com.zmartcredential.entity.Enrollment;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.repository.EnrollmentRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Re-credentialing schedule: due date = effective date + payer.recred_cycle_months. */
@Service
@RequiredArgsConstructor
public class RecredentialingService {

    private static final Set<String> WINDOWS = Set.of("all", "overdue", "30", "60", "90");

    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentSupport support;
    private final AuthContext authContext;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public RecredScheduleResponse schedule(String window) {
        permissionService.require("enrollment", "list");
        authContext.requireStaff();
        String w = window == null || window.isBlank() ? "all" : window;
        if (!WINDOWS.contains(w)) throw new BadRequestException("window must be all, overdue, 30, 60 or 90");
        Long orgId = authContext.orgId();
        LocalDate today = LocalDate.now();
        Map<Long, Provider> providers = support.providerMap(orgId);
        Map<Long, Payer> payers = support.payerMap();
        List<Enrollment> all = enrollmentRepository.findByOrgId(orgId);

        // latest approved enrollment per provider+payer (an approved recred supersedes the original)
        Map<String, Enrollment> latest = new HashMap<>();
        for (Enrollment e : all) {
            if (!"approved".equals(e.getStatus()) || e.getEffectiveDate() == null) continue;
            if (!providers.containsKey(e.getProviderId())) continue;
            latest.merge(e.getProviderId() + ":" + e.getPayerId(), e,
                    (a, b) -> b.getEffectiveDate().isAfter(a.getEffectiveDate()) ? b : a);
        }
        // open recred applications per provider+payer
        Map<String, Long> openRecred = new HashMap<>();
        for (Enrollment e : all) {
            if ("recred".equals(e.getApplicationType()) && !"approved".equals(e.getStatus()) && !"terminated".equals(e.getStatus())) {
                openRecred.merge(e.getProviderId() + ":" + e.getPayerId(), e.getId(), Math::max);
            }
        }

        List<RecredScheduleResponse.Item> items = latest.entrySet().stream().map(en -> {
            Enrollment e = en.getValue();
            Provider p = providers.get(e.getProviderId());
            Payer payer = payers.get(e.getPayerId());
            int cycle = payer == null || payer.getRecredCycleMonths() == null ? 24 : payer.getRecredCycleMonths();
            LocalDate due = e.getEffectiveDate().plusMonths(cycle);
            long days = ChronoUnit.DAYS.between(today, due);
            return new RecredScheduleResponse.Item(e.getId(), p.getId(), EnrollmentSupport.fullName(p), p.getNpi(),
                    e.getPayerId(), payer == null ? null : payer.getName(), payer == null ? null : payer.getColor(),
                    e.getEffectiveDate(), cycle, due, days, bucket(days), openRecred.get(en.getKey()));
        }).sorted(Comparator.comparingLong(RecredScheduleResponse.Item::daysUntil)).toList();

        RecredScheduleResponse.Counts counts = new RecredScheduleResponse.Counts(items.size(),
                count(items, "overdue"), count(items, "30"), count(items, "60"), count(items, "90"), count(items, "future"));
        List<RecredScheduleResponse.Item> filtered = items.stream().filter(i -> inWindow(i.bucket(), w)).toList();
        return new RecredScheduleResponse(today, w, counts, filtered);
    }

    static String bucket(long days) {
        if (days < 0) return "overdue";
        if (days <= 30) return "30";
        if (days <= 60) return "60";
        if (days <= 90) return "90";
        return "future";
    }

    /** Windows are cumulative: 60 includes overdue + 30 + 60. */
    private static boolean inWindow(String bucket, String window) {
        return switch (window) {
            case "overdue" -> "overdue".equals(bucket);
            case "30" -> Set.of("overdue", "30").contains(bucket);
            case "60" -> Set.of("overdue", "30", "60").contains(bucket);
            case "90" -> !"future".equals(bucket);
            default -> true;
        };
    }

    private static long count(List<RecredScheduleResponse.Item> items, String bucket) {
        return items.stream().filter(i -> bucket.equals(i.bucket())).count();
    }
}
