package com.zmartcredential.service;

import com.zmartcredential.dto.enrollment.RosterReconciliationResponse;
import com.zmartcredential.dto.enrollment.RosterTerminationResponse;
import com.zmartcredential.dto.enrollment.RosterUploadRequest;
import com.zmartcredential.dto.enrollment.RosterUploadResponse;
import com.zmartcredential.entity.Enrollment;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.PayerRosterEntry;
import com.zmartcredential.entity.PayerRosterUpload;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.Task;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.EnrollmentRepository;
import com.zmartcredential.repository.PayerRosterEntryRepository;
import com.zmartcredential.repository.PayerRosterUploadRepository;
import com.zmartcredential.repository.TaskRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static com.zmartcredential.service.EnrollmentSupport.blankToNull;
import static com.zmartcredential.service.EnrollmentSupport.truncate;

/**
 * Payer roster reconciliation: compares the latest uploaded payer roster (CSV parsed by the frontend)
 * with the organization's approved enrollments for that payer. Live roster fetch is deferred.
 */
@Service
@RequiredArgsConstructor
public class RosterReconciliationService {

    private final PayerRosterUploadRepository uploadRepository;
    private final PayerRosterEntryRepository entryRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TaskRepository taskRepository;
    private final EnrollmentSupport support;
    private final AuthContext authContext;
    private final NotificationService notificationService;

    @Transactional
    public RosterUploadResponse upload(Long payerId, RosterUploadRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK);
        Long orgId = authContext.orgId();
        Payer payer = support.payer(payerId);
        PayerRosterUpload u = new PayerRosterUpload();
        u.setOrgId(orgId);
        u.setPayerId(payer.getId());
        u.setFileName(truncate(blankToNull(req.fileName()), 255));
        u.setRowCount(req.entries().size());
        u.setUploadedBy(authContext.userId());
        u = uploadRepository.saveAndFlush(u);
        List<PayerRosterEntry> entries = new ArrayList<>();
        for (RosterUploadRequest.Entry r : req.entries()) {
            PayerRosterEntry e = new PayerRosterEntry();
            e.setUploadId(u.getId());
            e.setNpi(blankToNull(r.npi()));
            e.setFirstName(blankToNull(r.firstName()));
            e.setLastName(blankToNull(r.lastName()));
            e.setSpecialty(blankToNull(r.specialty()));
            e.setActionStatus("none");
            entries.add(e);
        }
        entryRepository.saveAll(entries);
        return new RosterUploadResponse(u.getId(), payer.getId(), u.getFileName(), u.getRowCount(), u.getUploadedAt());
    }

    @Transactional(readOnly = true)
    public RosterReconciliationResponse reconcile(Long payerId) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Payer payer = support.payer(payerId);
        Map<Long, Provider> providers = support.providerMap(orgId);

        // our approved roster: provider -> enrollment
        Map<Long, Enrollment> ours = new LinkedHashMap<>();
        for (Enrollment e : enrollmentRepository.findByOrgIdAndPayerId(orgId, payerId)) {
            if ("approved".equals(e.getStatus()) && providers.containsKey(e.getProviderId())) ours.putIfAbsent(e.getProviderId(), e);
        }
        PayerRosterUpload upload = uploadRepository.findFirstByOrgIdAndPayerIdOrderByUploadedAtDesc(orgId, payerId).orElse(null);
        if (upload == null) {
            return new RosterReconciliationResponse(payer.getId(), payer.getName(), payer.getColor(), null, null, null, null,
                    ours.size(), List.of(), List.of(), List.of(), "deferred",
                    "Upload the payer roster (CSV) to reconcile. Fetching rosters directly from payers will be available in a later phase.");
        }

        Map<String, Provider> byNpi = new HashMap<>();
        Map<String, Provider> byName = new HashMap<>();
        for (Provider p : providers.values()) {
            if (p.getNpi() != null) byNpi.put(p.getNpi().trim(), p);
            byName.putIfAbsent(nameKey(p.getFirstName(), p.getLastName()), p);
        }

        List<RosterReconciliationResponse.Matched> matched = new ArrayList<>();
        List<RosterReconciliationResponse.NotOurs> notOurs = new ArrayList<>();
        Set<Long> matchedProviders = new HashSet<>();
        for (PayerRosterEntry en : entryRepository.findByUploadId(upload.getId())) {
            Provider p = en.getNpi() != null ? byNpi.get(en.getNpi().trim()) : byName.get(nameKey(en.getFirstName(), en.getLastName()));
            if (p != null && ours.containsKey(p.getId()) && !matchedProviders.contains(p.getId())) {
                matchedProviders.add(p.getId());
                matched.add(new RosterReconciliationResponse.Matched(p.getId(), EnrollmentSupport.fullName(p), p.getNpi(),
                        p.getSpecialty(), ours.get(p.getId()).getId(), en.getId()));
            } else {
                notOurs.add(new RosterReconciliationResponse.NotOurs(en.getId(), en.getNpi(), en.getFirstName(), en.getLastName(),
                        en.getSpecialty(), en.getActionStatus(), p == null ? null : p.getId(),
                        p == null ? "not_our_provider" : "not_approved"));
            }
        }
        List<RosterReconciliationResponse.Missing> missing = ours.values().stream()
                .filter(e -> !matchedProviders.contains(e.getProviderId()))
                .map(e -> {
                    Provider p = providers.get(e.getProviderId());
                    return new RosterReconciliationResponse.Missing(p.getId(), EnrollmentSupport.fullName(p), p.getNpi(),
                            p.getSpecialty(), e.getId());
                }).toList();
        return new RosterReconciliationResponse(payer.getId(), payer.getName(), payer.getColor(), upload.getId(),
                upload.getFileName(), upload.getRowCount(), upload.getUploadedAt(), ours.size(), matched, missing, notOurs,
                null, null);
    }

    @Transactional
    public RosterTerminationResponse requestTermination(Long entryId) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK);
        Long orgId = authContext.orgId();
        PayerRosterEntry en = entryRepository.findById(entryId).orElseThrow(() -> NotFoundException.of("Roster entry", entryId));
        PayerRosterUpload upload = uploadRepository.findByIdAndOrgId(en.getUploadId(), orgId)
                .orElseThrow(() -> NotFoundException.of("Roster entry", entryId));
        if ("termination_requested".equals(en.getActionStatus())) {
            throw new ConflictException("A termination request was already created for this roster entry");
        }
        Payer payer = support.payer(upload.getPayerId());
        String name = ((en.getFirstName() == null ? "" : en.getFirstName()) + " " + (en.getLastName() == null ? "" : en.getLastName())).trim();
        if (name.isEmpty()) name = "Unknown provider";
        Long providerId = en.getNpi() == null ? null : support.providerMap(orgId).values().stream()
                .filter(p -> en.getNpi().equals(p.getNpi())).map(Provider::getId).findFirst().orElse(null);

        en.setActionStatus("termination_requested");
        entryRepository.save(en);

        Task t = new Task();
        t.setOrgId(orgId);
        t.setTitle(truncate("Request roster termination: " + name + (en.getNpi() == null ? "" : " (NPI " + en.getNpi() + ")")
                + " — " + payer.getName(), 255));
        t.setDescription(name + " appears on the " + payer.getName() + " roster"
                + (upload.getFileName() == null ? "" : " (" + upload.getFileName() + ")")
                + " but is not an approved provider of this organization. Ask the payer to terminate the listing.");
        t.setPriority("high");
        t.setStatus("open");
        t.setDueDate(LocalDate.now().plusDays(7));
        t.setProviderId(providerId);
        t.setCreatedBy(authContext.userId());
        t = taskRepository.save(t);
        notificationService.notifyOrg(orgId, "Roster termination requested", name + " — " + payer.getName(),
                "UserX", NotificationService.WARN);
        return new RosterTerminationResponse(en.getId(), en.getActionStatus(), t.getId());
    }

    private static String nameKey(String first, String last) {
        return ((first == null ? "" : first.trim()) + "|" + (last == null ? "" : last.trim())).toLowerCase(Locale.ROOT);
    }
}
