package com.zmartcredential.service;

import com.zmartcredential.dto.credentialing.OpsHubDtos.HospitalItem;
import com.zmartcredential.dto.credentialing.OpsHubDtos.HospitalRequest;
import com.zmartcredential.dto.credentialing.OpsHubDtos.PrivilegeItemStatus;
import com.zmartcredential.dto.credentialing.OpsHubDtos.PrivilegeSummaryRow;
import com.zmartcredential.dto.credentialing.OpsHubDtos.PrivilegeUpsertRequest;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ProviderPrivilegesResponse;
import com.zmartcredential.entity.Hospital;
import com.zmartcredential.entity.PrivilegeCategory;
import com.zmartcredential.entity.PrivilegeItem;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.ProviderPrivilege;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.HospitalRepository;
import com.zmartcredential.repository.PrivilegeCategoryRepository;
import com.zmartcredential.repository.PrivilegeItemRepository;
import com.zmartcredential.repository.ProviderPrivilegeRepository;
import com.zmartcredential.security.AuthContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Hospitals and clinical privileges per provider per hospital (PrivilegingView). */
@Service
@RequiredArgsConstructor
public class OpsPrivilegeService {

    private final HospitalRepository hospitalRepository;
    private final PrivilegeCategoryRepository categoryRepository;
    private final PrivilegeItemRepository itemRepository;
    private final ProviderPrivilegeRepository privilegeRepository;
    private final OpsLookupService lookup;
    private final AuthContext authContext;

    // ---------------------------------------------------------------- hospitals

    @Transactional(readOnly = true)
    public List<HospitalItem> hospitals() {
        authContext.requireStaff();
        return hospitalRepository.findByOrgIdOrderByNameAsc(authContext.orgId()).stream().map(OpsPrivilegeService::toItem).toList();
    }

    @Transactional
    public HospitalItem createHospital(HospitalRequest req) {
        lookup.requireWriter();
        Hospital h = new Hospital();
        h.setOrgId(authContext.orgId());
        apply(h, req);
        return toItem(hospitalRepository.save(h));
    }

    @Transactional
    public HospitalItem updateHospital(Long id, HospitalRequest req) {
        lookup.requireWriter();
        Hospital h = loadHospital(id, authContext.orgId());
        apply(h, req);
        return toItem(hospitalRepository.save(h));
    }

    @Transactional
    public void deleteHospital(Long id) {
        lookup.requireWriter();
        hospitalRepository.delete(loadHospital(id, authContext.orgId()));
    }

    // ---------------------------------------------------------------- privileges

    /** Same keyword mapping as the prototype: interventional, electro(physiology), pediatric, else cardiology. */
    public static String categoryFor(String specialty) {
        String s = specialty == null ? "" : specialty.toLowerCase(Locale.ROOT);
        if (s.contains("interventional")) return "interventional";
        if (s.contains("electro")) return "electrophysiology";
        if (s.contains("pediatric")) return "pediatrics";
        return "cardiology";
    }

    @Transactional(readOnly = true)
    public ProviderPrivilegesResponse privileges(Long providerId, Long hospitalId) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Provider p = lookup.requireProvider(orgId, providerId);
        Hospital h = loadHospital(hospitalId, orgId);
        String code = categoryFor(p.getSpecialty());
        String categoryName = categoryRepository.findById(code).map(PrivilegeCategory::getName).orElse(code);
        Map<Long, ProviderPrivilege> current = privilegeRepository.findByProviderIdAndHospitalId(p.getId(), h.getId()).stream()
                .filter(pp -> orgId.equals(pp.getOrgId()))
                .collect(Collectors.toMap(ProviderPrivilege::getPrivilegeItemId, Function.identity(), (a, b) -> a));
        List<PrivilegeItemStatus> items = new ArrayList<>();
        List<PrivilegeItem> catalog = new ArrayList<>(itemRepository.findByCategoryCodeOrderBySortOrderAsc(code));
        // privileges recorded under another category (e.g. specialty changed) are still shown
        java.util.Set<Long> catalogIds = catalog.stream().map(PrivilegeItem::getId).collect(Collectors.toSet());
        current.keySet().stream().filter(id -> !catalogIds.contains(id))
                .forEach(id -> itemRepository.findById(id).ifPresent(catalog::add));
        for (PrivilegeItem it : catalog) {
            ProviderPrivilege pp = current.get(it.getId());
            items.add(new PrivilegeItemStatus(it.getId(), it.getName(), it.getSortOrder() == null ? 0 : it.getSortOrder(),
                    pp == null ? "none" : pp.getStatus(), pp == null ? null : pp.getRequestedAt(),
                    pp == null ? null : pp.getDecidedAt()));
        }
        return new ProviderPrivilegesResponse(p.getId(), OpsLookupService.fullName(p), p.getSpecialty(), h.getId(), h.getName(),
                code, categoryName, items);
    }

    @Transactional
    public PrivilegeItemStatus upsert(PrivilegeUpsertRequest req) {
        lookup.requireWriter();
        Long orgId = authContext.orgId();
        Provider p = lookup.requireProvider(orgId, req.providerId());
        Hospital h = loadHospital(req.hospitalId(), orgId);
        PrivilegeItem item = itemRepository.findById(req.privilegeItemId())
                .orElseThrow(() -> new BadRequestException("Unknown privilege"));
        ProviderPrivilege pp = privilegeRepository.findByProviderIdAndHospitalId(p.getId(), h.getId()).stream()
                .filter(x -> x.getPrivilegeItemId().equals(item.getId())).findFirst().orElse(null);
        if ("none".equals(req.status())) {
            if (pp != null) privilegeRepository.delete(pp);
            return new PrivilegeItemStatus(item.getId(), item.getName(), item.getSortOrder() == null ? 0 : item.getSortOrder(),
                    "none", null, null);
        }
        LocalDate today = LocalDate.now();
        if (pp == null) {
            pp = new ProviderPrivilege();
            pp.setOrgId(orgId);
            pp.setProviderId(p.getId());
            pp.setHospitalId(h.getId());
            pp.setPrivilegeItemId(item.getId());
            pp.setRequestedAt(today);
        }
        if (!req.status().equals(pp.getStatus()) || pp.getId() == null) {
            pp.setStatus(req.status());
            boolean decided = "granted".equals(req.status()) || "denied".equals(req.status());
            pp.setDecidedAt(decided ? today : null);
        }
        pp.setUpdatedBy(authContext.userId());
        privilegeRepository.save(pp);
        return new PrivilegeItemStatus(item.getId(), item.getName(), item.getSortOrder() == null ? 0 : item.getSortOrder(),
                pp.getStatus(), pp.getRequestedAt(), pp.getDecidedAt());
    }

    @Transactional(readOnly = true)
    public List<PrivilegeSummaryRow> summary(Long providerId, Long hospitalId) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Map<Long, Provider> providers = lookup.providersById(orgId);
        Map<Long, Hospital> hospitals = hospitalRepository.findByOrgId(orgId).stream()
                .collect(Collectors.toMap(Hospital::getId, Function.identity()));
        Map<String, long[]> counts = new LinkedHashMap<>();
        for (ProviderPrivilege pp : privilegeRepository.findByOrgId(orgId)) {
            if (providerId != null && !providerId.equals(pp.getProviderId())) continue;
            if (hospitalId != null && !hospitalId.equals(pp.getHospitalId())) continue;
            long[] c = counts.computeIfAbsent(pp.getProviderId() + ":" + pp.getHospitalId(), k -> new long[4]);
            switch (pp.getStatus()) {
                case "requested" -> c[0]++;
                case "pending" -> c[1]++;
                case "granted" -> c[2]++;
                case "denied" -> c[3]++;
                default -> { }
            }
        }
        List<PrivilegeSummaryRow> rows = new ArrayList<>();
        counts.forEach((key, c) -> {
            String[] ids = key.split(":");
            Long pid = Long.valueOf(ids[0]);
            Long hid = Long.valueOf(ids[1]);
            Provider p = providers.get(pid);
            Hospital h = hospitals.get(hid);
            if (p == null || h == null) return;
            rows.add(new PrivilegeSummaryRow(pid, OpsLookupService.plainName(p), hid, h.getName(),
                    c[0], c[1], c[2], c[3], c[0] + c[1] + c[2] + c[3]));
        });
        rows.sort(Comparator.comparing(PrivilegeSummaryRow::providerName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(PrivilegeSummaryRow::hospitalName, String.CASE_INSENSITIVE_ORDER));
        return rows;
    }

    // ---------------------------------------------------------------- helpers

    private Hospital loadHospital(Long id, Long orgId) {
        if (id == null) throw new NotFoundException("Hospital not found");
        return hospitalRepository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Hospital", id));
    }

    private static void apply(Hospital h, HospitalRequest req) {
        h.setName(req.name().trim());
        h.setCity(req.city() == null || req.city().isBlank() ? null : req.city().trim());
        h.setState(req.state() == null || req.state().isBlank() ? null : req.state().toUpperCase(Locale.ROOT));
        if (req.active() != null) h.setActive(req.active());
        if (h.getActive() == null) h.setActive(true);
    }

    private static HospitalItem toItem(Hospital h) {
        return new HospitalItem(h.getId(), h.getName(), h.getCity(), h.getState(), Boolean.TRUE.equals(h.getActive()));
    }
}
