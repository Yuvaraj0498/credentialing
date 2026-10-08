package com.zmartcredential.service;

import com.zmartcredential.dto.payer.PayerFormResponse;
import com.zmartcredential.dto.payer.PayerOverviewItem;
import com.zmartcredential.dto.payer.PayerRequest;
import com.zmartcredential.dto.payer.PayerResponse;
import com.zmartcredential.entity.Enrollment;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.PayerCredential;
import com.zmartcredential.entity.PayerForm;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.EnrollmentRepository;
import com.zmartcredential.repository.PayerCredentialRepository;
import com.zmartcredential.repository.PayerFormRepository;
import com.zmartcredential.repository.PayerRepository;
import com.zmartcredential.repository.PayerSubmissionRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static com.zmartcredential.service.EnrollmentSupport.blankToNull;

/** Global payer catalog (payer + payer_form) and per-org payer statistics. */
@Service
@RequiredArgsConstructor
public class PayerService {

    private final PayerRepository payerRepository;
    private final PayerFormRepository formRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PayerSubmissionRepository submissionRepository;
    private final PayerCredentialRepository credentialRepository;
    private final PermissionService permissionService;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public List<PayerResponse> list(boolean activeOnly) {
        permissionService.require("payer", "list");
        List<Payer> payers = activeOnly ? payerRepository.findByActiveTrueOrderBySortOrderAsc()
                : payerRepository.findAllByOrderBySortOrderAsc();
        Map<Long, List<PayerForm>> forms = formsByPayer();
        return payers.stream().map(p -> EnrollmentSupport.toPayerResponse(p, forms.get(p.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public PayerResponse get(Long id) {
        permissionService.require("payer", "read");
        Payer p = load(id);
        return EnrollmentSupport.toPayerResponse(p, formRepository.findByPayerIdOrderBySortOrderAsc(id));
    }

    @Transactional(readOnly = true)
    public List<PayerFormResponse> forms(Long payerId) {
        permissionService.require("payer", "read");
        load(payerId);
        return formRepository.findByPayerIdOrderBySortOrderAsc(payerId).stream().map(EnrollmentSupport::toFormResponse).toList();
    }

    @Transactional
    public PayerResponse create(PayerRequest req) {
        permissionService.require("payer", "create");
        String code = req.code().trim();
        if (payerRepository.findByCode(code).isPresent()) {
            throw new ConflictException("A payer with code '" + code + "' already exists");
        }
        Payer p = new Payer();
        apply(p, req);
        p = payerRepository.save(p);
        return EnrollmentSupport.toPayerResponse(p, List.of());
    }

    @Transactional
    public PayerResponse update(Long id, PayerRequest req) {
        permissionService.require("payer", "update");
        Payer p = load(id);
        String code = req.code().trim();
        payerRepository.findByCode(code).filter(other -> !other.getId().equals(id)).ifPresent(other -> {
            throw new ConflictException("A payer with code '" + code + "' already exists");
        });
        apply(p, req);
        p = payerRepository.save(p);
        return EnrollmentSupport.toPayerResponse(p, formRepository.findByPayerIdOrderBySortOrderAsc(id));
    }

    @Transactional
    public void delete(Long id) {
        permissionService.require("payer", "delete");
        Payer p = load(id);
        if (enrollmentRepository.existsByPayerId(id) || submissionRepository.existsByPayerId(id)) {
            throw new ConflictException(p.getName() + " is referenced by enrollments or submissions. Deactivate it instead.");
        }
        payerRepository.delete(p);
    }

    /** Per-payer stats for the current organization (PayersView cards). */
    @Transactional(readOnly = true)
    public List<PayerOverviewItem> overview(boolean activeOnly) {
        permissionService.require("payer", "list");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        List<Payer> payers = activeOnly ? payerRepository.findByActiveTrueOrderBySortOrderAsc()
                : payerRepository.findAllByOrderBySortOrderAsc();
        Map<Long, List<PayerForm>> forms = formsByPayer();
        Map<Long, List<Enrollment>> byPayer = enrollmentRepository.findByOrgId(orgId).stream()
                .collect(Collectors.groupingBy(Enrollment::getPayerId));
        Set<Long> orgCreds = credentialRepository.findByOrgIdAndProviderIdIsNull(orgId).stream()
                .map(PayerCredential::getPayerId).collect(Collectors.toSet());

        return payers.stream().map(p -> {
            List<Enrollment> list = byPayer.getOrDefault(p.getId(), List.of());
            long enrolled = list.stream().filter(e -> "approved".equals(e.getStatus()))
                    .map(Enrollment::getProviderId).distinct().count();
            long inProgress = list.stream()
                    .filter(e -> "in_progress".equals(e.getStatus()) || "submitted".equals(e.getStatus())).count();
            List<Integer> tats = list.stream().map(e -> EnrollmentSupport.tat(e.getSubmittedDate(), e.getEffectiveDate()))
                    .filter(Objects::nonNull).toList();
            Integer avg = tats.isEmpty() ? p.getAvgTatDays()
                    : Integer.valueOf((int) Math.round(tats.stream().mapToInt(Integer::intValue).average().orElse(0)));
            return new PayerOverviewItem(EnrollmentSupport.toPayerResponse(p, forms.get(p.getId())),
                    enrolled, inProgress, avg, !tats.isEmpty(), orgCreds.contains(p.getId()));
        }).toList();
    }

    private Map<Long, List<PayerForm>> formsByPayer() {
        return formRepository.findAll().stream()
                .sorted(Comparator.comparing(PayerForm::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.groupingBy(PayerForm::getPayerId));
    }

    private Payer load(Long id) {
        return payerRepository.findById(id).orElseThrow(() -> NotFoundException.of("Payer", id));
    }

    private static void apply(Payer p, PayerRequest r) {
        p.setCode(r.code().trim());
        p.setName(r.name().trim());
        p.setFullName(blankToNull(r.fullName()));
        p.setCategory(r.category().trim());
        p.setPayerType(blankToNull(r.payerType()));
        if (r.color() != null) p.setColor(r.color());
        p.setAppForm(blankToNull(r.appForm()));
        if (r.integration() != null) p.setIntegration(r.integration());
        if (r.apiSupport() != null) p.setApiSupport(r.apiSupport());
        p.setCaqhParticipating(Boolean.TRUE.equals(r.caqhParticipating()));
        p.setPortalUrl(blankToNull(r.portalUrl()));
        p.setAvgTatDays(r.avgTatDays());
        p.setPricingCategory(blankToNull(r.pricingCategory()));
        p.setPricingMult(r.pricingMult() == null ? new BigDecimal("1.00") : r.pricingMult());
        p.setRecredCycleMonths(r.recredCycleMonths() == null ? 24 : r.recredCycleMonths());
        if (r.sortOrder() != null) p.setSortOrder(r.sortOrder());
        p.setActive(r.active() == null || r.active());
    }
}
