package com.zmartcredential.service;

import com.zmartcredential.dto.provider.ProviderDtos.ProviderImportCreated;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderImportRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderImportResult;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderImportRow;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderImportSkipped;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.repository.ProviderDocumentRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import static com.zmartcredential.service.ProviderModuleSupport.blankToNull;

/** Creates providers from CAQH CSV rows parsed by the frontend (single export or bulk roster). */
@Service
@RequiredArgsConstructor
public class ProviderImportService {

    private static final Pattern NPI = Pattern.compile("^\\d{10}$");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern DIGITS = Pattern.compile("^\\d{1,10}$");
    private static final Pattern STATE = Pattern.compile("^[A-Za-z]{2}$");
    private static final DateTimeFormatter US_DATE = DateTimeFormatter.ofPattern("M/d/yyyy");

    private final ProviderRepository providerRepository;
    private final EmailRegistry emailRegistry;
    private final ProviderDocumentRepository documentRepository;
    private final ProviderDocumentInitializer documentInitializer;
    private final ProviderService providerService;
    private final NotificationService notificationService;
    private final PermissionService permissionService;
    private final AuthContext authContext;

    @Transactional
    public ProviderImportResult importProviders(ProviderImportRequest req) {
        permissionService.require("provider", "create");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        ProviderService.Hierarchy h = providerService.resolveHierarchy(orgId, null, req.practiceId(), req.locationId());
        LocalDate today = LocalDate.now();
        List<ProviderImportCreated> created = new ArrayList<>();
        List<ProviderImportSkipped> skipped = new ArrayList<>();
        Set<String> seenNpis = new HashSet<>();
        Set<String> seenEmails = new HashSet<>();
        for (int i = 0; i < req.providers().size(); i++) {
            ProviderImportRow r = req.providers().get(i);
            int rowIndex = r.rowIndex() != null ? r.rowIndex() : i + 1;
            String first = blankToNull(r.firstName());
            String last = blankToNull(r.lastName());
            String name = ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
            String npi = blankToNull(r.npi());
            String email = blankToNull(r.email());
            List<String> errors = new ArrayList<>();
            if (first == null || last == null) errors.add("Missing name");
            if (npi == null || !NPI.matcher(npi).matches()) errors.add("Invalid NPI");
            if (email != null && !EMAIL.matcher(email).matches()) errors.add("Invalid email");
            if (first != null && first.length() > 80 || last != null && last.length() > 80) errors.add("Name too long");
            if (!errors.isEmpty()) {
                skipped.add(new ProviderImportSkipped(rowIndex, name, String.join("; ", errors)));
                continue;
            }
            if (!seenNpis.add(npi)) {
                skipped.add(new ProviderImportSkipped(rowIndex, name, "Duplicate NPI " + npi + " in this file"));
                continue;
            }
            if (providerRepository.existsByOrgIdAndNpi(orgId, npi)) {
                skipped.add(new ProviderImportSkipped(rowIndex, name,
                        "A provider with NPI " + npi + " already exists"));
                continue;
            }
            if (email != null && (emailRegistry.inUse(email) || !seenEmails.add(email.toLowerCase()))) {
                skipped.add(new ProviderImportSkipped(rowIndex, name, "Email " + email + " is already used"));
                continue;
            }
            Provider p = new Provider();
            p.setOrgId(orgId);
            p.setFirstName(first);
            p.setLastName(last);
            p.setSuffix(truncate(blankToNull(r.suffix()), 10));
            p.setNpi(npi);
            String caqh = blankToNull(r.caqhId());
            p.setCaqhId(caqh != null && DIGITS.matcher(caqh).matches() ? caqh : null);
            p.setSpecialty(truncate(blankToNull(r.specialty()), 120));
            p.setTaxonomyCode(truncate(blankToNull(r.taxonomy()), 20));
            p.setDateOfBirth(date(r.dob()));
            p.setGender(truncate(blankToNull(r.gender()), 20));
            p.setEmail(email == null ? null : truncate(email.toLowerCase(), 255));
            p.setPhone(truncate(blankToNull(r.phone()), 30));
            p.setLicenseNumber(truncate(blankToNull(r.license()), 40));
            String state = blankToNull(r.licenseState());
            p.setLicenseState(state != null && STATE.matcher(state).matches() ? state.toUpperCase() : null);
            LocalDate licenseExp = date(r.licenseExpiration());
            p.setLicenseExpires(licenseExp);
            p.setDeaNumber(truncate(blankToNull(r.dea()), 20));
            LocalDate deaExp = date(r.deaExpiration());
            p.setDeaExpires(deaExp);
            p.setBoardCert(truncate(blankToNull(r.boardCert()), 200));
            p.setMalpracticeCarrier(truncate(blankToNull(r.malpracticeCarrier()), 200));
            p.setCaqhLastAttested(date(r.lastAttestation()));
            p.setCaqhAttestationStatus(truncate(blankToNull(r.attestationStatus()), 30));
            p.setClientId(h.clientId());
            p.setPracticeId(h.practiceId());
            p.setLocationId(h.locationId());
            p.setStatus("draft");
            p.setSource("caqh");
            p.setDateAdded(today);
            p = providerRepository.save(p);
            documentInitializer.initialize(p);
            // documents CAQH reports as on file (no file is attached; expired when past expiration)
            markOnFile(p, "medical_license", p.getLicenseNumber() != null, licenseExp, today);
            markOnFile(p, "dea", p.getDeaNumber() != null, deaExp, today);
            markOnFile(p, "malpractice", p.getMalpracticeCarrier() != null, date(r.malpracticeExpiration()), today);
            markOnFile(p, "board_cert", p.getBoardCert() != null, date(r.boardCertExpiration()), today);
            created.add(new ProviderImportCreated(p.getId(), name));
        }
        if (!created.isEmpty()) {
            String body = created.size() == 1
                    ? created.get(0).name() + " was imported from CAQH."
                    : created.size() + " providers were imported from CAQH"
                    + (skipped.isEmpty() ? "." : " (" + skipped.size() + " skipped).");
            notificationService.notifyOrg(orgId, "Provider(s) imported from CAQH", body, "Download",
                    NotificationService.SUCCESS);
        }
        return new ProviderImportResult(created, skipped);
    }

    private void markOnFile(Provider p, String docType, boolean present, LocalDate expires, LocalDate today) {
        if (!present) return;
        documentRepository.findByProviderIdAndDocType(p.getId(), docType).ifPresent(d -> {
            if ("na".equals(d.getStatus())) return;
            d.setStatus(expires != null && expires.isBefore(today) ? "expired" : "approved");
            d.setExpiresAt(expires);
            documentRepository.save(d);
        });
    }

    private static LocalDate date(String s) {
        String v = blankToNull(s);
        if (v == null) return null;
        try {
            return LocalDate.parse(v.length() > 10 ? v.substring(0, 10) : v);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(v, US_DATE);
            } catch (DateTimeParseException e2) {
                return null;
            }
        }
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
