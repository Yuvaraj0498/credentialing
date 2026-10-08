package com.zmartcredential.service;

import com.zmartcredential.dto.provider.ProviderVerificationDtos.DeferredIntegrationResponse;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.LetterHospital;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.LetterOrganization;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.LetterProvider;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.LetterRequest;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.LetterResponse;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.VerificationRequest;
import com.zmartcredential.dto.provider.ProviderVerificationDtos.VerificationResponse;
import com.zmartcredential.entity.GeneratedLetter;
import com.zmartcredential.entity.Hospital;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.VerificationCheck;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.repository.GeneratedLetterRepository;
import com.zmartcredential.repository.HospitalRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.VerificationCheckRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.zmartcredential.service.ProviderModuleSupport.blankToNull;
import static com.zmartcredential.service.ProviderModuleSupport.fullName;

/** Primary source verification (manual results; automatic lookups deferred) and appointment letters. */
@Service
@RequiredArgsConstructor
public class ProviderVerificationService {

    public static final String DEFERRED_MESSAGE = "Automatic NPPES / OIG / SAM checks will be available in a later "
            + "phase. Record a manual verification instead.";
    private static final Map<String, String> SOURCE_LABELS = Map.of(
            "npi", "NPI Registry (CMS NPPES)", "oig", "OIG Exclusions (HHS OIG LEIE)",
            "sam", "SAM.gov Exclusions", "state_license", "State Licensure");
    private static final Role[] WRITERS = {Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK};
    private static final int RECRED_MONTHS = 24;

    private final VerificationCheckRepository verificationRepository;
    private final GeneratedLetterRepository letterRepository;
    private final HospitalRepository hospitalRepository;
    private final OrganizationRepository organizationRepository;
    private final NotificationService notificationService;
    private final ProviderModuleSupport support;
    private final AuthContext authContext;

    public static DeferredIntegrationResponse deferred() {
        return new DeferredIntegrationResponse("deferred", DEFERRED_MESSAGE);
    }

    // ---------- verifications ----------

    @Transactional(readOnly = true)
    public List<VerificationResponse> history(Long providerId) {
        Provider p = support.loadForStaff(providerId);
        List<VerificationCheck> checks = verificationRepository.findByProviderIdOrderByCheckedAtDesc(p.getId()).stream()
                .filter(c -> Objects.equals(c.getOrgId(), p.getOrgId())).toList();
        Map<Long, String> names = support.userNames(checks.stream().map(VerificationCheck::getRunBy).toList());
        return checks.stream().map(c -> toResponse(c, names.get(c.getRunBy()))).toList();
    }

    @Transactional
    public VerificationResponse record(Long providerId, VerificationRequest req) {
        authContext.requireRole(WRITERS);
        Provider p = support.loadForStaff(providerId);
        VerificationCheck c = new VerificationCheck();
        c.setOrgId(p.getOrgId());
        c.setProviderId(p.getId());
        c.setSource(req.source());
        c.setStatus(req.status());
        c.setMessage(blankToNull(req.message()));
        c.setCheckedAt(LocalDateTime.now());
        c.setRunBy(authContext.userId());
        c = verificationRepository.save(c);
        if ("flagged".equals(req.status())) {
            notificationService.notifyOrg(p.getOrgId(), "Verification flagged",
                    SOURCE_LABELS.get(req.source()) + " check for " + fullName(p) + " was flagged"
                            + (c.getMessage() == null ? "." : ": " + c.getMessage()),
                    "ShieldAlert", NotificationService.DANGER);
        }
        return toResponse(c, support.userName(c.getRunBy()));
    }

    @Transactional(readOnly = true)
    public DeferredIntegrationResponse run(Long providerId) {
        support.loadForStaff(providerId);
        return deferred();
    }

    private static VerificationResponse toResponse(VerificationCheck c, String runByName) {
        return new VerificationResponse(c.getId(), c.getProviderId(), c.getSource(),
                SOURCE_LABELS.getOrDefault(c.getSource(), c.getSource()), c.getStatus(), c.getMessage(),
                c.getCheckedAt(), c.getRunBy(), runByName);
    }

    // ---------- letters ----------

    @Transactional
    public LetterResponse generateLetter(Long providerId, LetterRequest req) {
        authContext.requireRole(WRITERS);
        Provider p = support.loadForStaff(providerId);
        Hospital hospital = null;
        if (req.hospitalId() != null) {
            hospital = hospitalRepository.findByIdAndOrgId(req.hospitalId(), p.getOrgId())
                    .orElseThrow(() -> new BadRequestException("Hospital " + req.hospitalId() + " was not found"));
        }
        GeneratedLetter l = new GeneratedLetter();
        l.setOrgId(p.getOrgId());
        l.setProviderId(p.getId());
        l.setHospitalId(hospital == null ? null : hospital.getId());
        l.setLetterType(req.letterType());
        l.setEffectiveDate(req.effectiveDate() == null ? LocalDate.now() : req.effectiveDate());
        l.setGeneratedBy(authContext.userId());
        l = letterRepository.save(l);
        if (l.getGeneratedAt() == null) l.setGeneratedAt(LocalDateTime.now());
        return toLetter(l, p, hospital);
    }

    @Transactional(readOnly = true)
    public List<LetterResponse> letters(Long providerId) {
        Provider p = support.loadForStaff(providerId);
        return letterRepository.findByProviderIdOrderByGeneratedAtDesc(p.getId()).stream()
                .filter(l -> Objects.equals(l.getOrgId(), p.getOrgId()))
                .map(l -> toLetter(l, p, l.getHospitalId() == null ? null
                        : hospitalRepository.findById(l.getHospitalId()).orElse(null)))
                .toList();
    }

    private LetterResponse toLetter(GeneratedLetter l, Provider p, Hospital h) {
        Organization org = organizationRepository.findById(l.getOrgId()).orElse(null);
        String where = h != null ? h.getName() : (org != null ? org.getName() : "our organization");
        String name = fullName(p) + ", " + (p.getSuffix() == null ? "MD" : p.getSuffix());
        String title;
        String text;
        switch (l.getLetterType()) {
            case "recred" -> {
                title = "Re-appointment Letter";
                text = name + " (NPI: " + nz(p.getNpi()) + ") has been re-appointed to the medical staff of " + where
                        + " following successful re-credentialing.";
            }
            case "privileging" -> {
                title = "Privileging Confirmation Letter";
                text = name + " (NPI: " + nz(p.getNpi()) + ") has been granted clinical privileges at " + where + ".";
            }
            default -> {
                title = "Letter of Appointment";
                text = name + " (NPI: " + nz(p.getNpi()) + ") has been granted initial appointment to the medical staff of "
                        + where + ".";
            }
        }
        return new LetterResponse(l.getId(), l.getLetterType(), title, "This letter confirms that " + text,
                new LetterProvider(p.getId(), p.getFirstName(), p.getLastName(), p.getSuffix(), p.getNpi(),
                        p.getSpecialty(), p.getLicenseNumber(), p.getLicenseState()),
                org == null ? null : new LetterOrganization(org.getId(), org.getName(), org.getAddress(), org.getCity(),
                        org.getState(), org.getZip(), org.getPhone(), org.getEmail()),
                h == null ? null : new LetterHospital(h.getId(), h.getName(), h.getCity(), h.getState()),
                l.getGeneratedAt() == null ? LocalDate.now() : l.getGeneratedAt().toLocalDate(),
                l.getEffectiveDate(), l.getEffectiveDate().plusMonths(RECRED_MONTHS),
                l.getGeneratedAt(), l.getGeneratedBy(), support.userName(l.getGeneratedBy()));
    }

    private static String nz(String s) {
        return s == null ? "—" : s;
    }
}
