package com.zmartcredential.service;

import com.zmartcredential.common.PageResponse;
import com.zmartcredential.dto.payer.PayerSubmissionBatchResponse;
import com.zmartcredential.dto.payer.PayerSubmissionRequest;
import com.zmartcredential.dto.payer.PayerSubmissionResponse;
import com.zmartcredential.dto.payer.PayerSubmissionUpdateRequest;
import com.zmartcredential.dto.payer.PortalLoginResponse;
import com.zmartcredential.entity.Enrollment;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.PayerCredential;
import com.zmartcredential.entity.PayerSubmission;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.EnrollmentRepository;
import com.zmartcredential.repository.PayerCredentialRepository;
import com.zmartcredential.repository.PayerSubmissionRepository;
import com.zmartcredential.repository.ProviderDocumentRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static com.zmartcredential.service.EnrollmentSupport.blankToNull;

/**
 * Payer submissions (PayerSubmissionCenter). A submission needs a stored portal login for the payer (the provider's own
 * login, else the organization's). It is recorded as 'in_progress' while staff complete the application in the payer's
 * portal (the admin app opens the portal and hands them the login), then the outcome is recorded manually.
 */
@Service
@RequiredArgsConstructor
public class PayerSubmissionService {

    public static final String QUEUED_MESSAGE = "Queued — automated payer submission will be available in a later phase";
    public static final String PORTAL_MESSAGE = "Opened the payer portal — complete the application there, then record the outcome";
    private static final Set<String> STATUSES = Set.of("queued", "in_progress", "submitted", "accepted", "rejected", "failed");

    private final PayerSubmissionRepository repository;
    private final PayerCredentialRepository credentialRepository;
    private final PortalLoginService portalLoginService;
    private final CryptoService cryptoService;
    private final EnrollmentRepository enrollmentRepository;
    private final ProviderDocumentRepository documentRepository;
    private final EnrollmentSupport support;
    private final AuthContext authContext;
    private final PermissionService permissionService;

    @Transactional
    public PayerSubmissionBatchResponse create(PayerSubmissionRequest req) {
        permissionService.require("payer_submission", "create");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Provider provider = support.provider(req.providerId(), orgId);
        int docs = (int) documentRepository.countByProviderIdAndStatus(provider.getId(), "approved");
        List<Enrollment> enrollments = enrollmentRepository.findByOrgIdAndProviderId(orgId, provider.getId());
        Map<Long, String> users = Map.of(authContext.userId(), support.actorLabel());

        List<PayerSubmissionResponse> out = new ArrayList<>();
        for (Long payerId : new LinkedHashSet<>(req.payerIds())) {
            Payer payer = support.payer(payerId);
            if (!Boolean.TRUE.equals(payer.getActive())) throw new BadRequestException(payer.getName() + " is inactive");
            PayerCredential login = loginFor(orgId, provider, payer);
            PayerSubmission s = new PayerSubmission();
            s.setOrgId(orgId);
            s.setProviderId(provider.getId());
            s.setPayerId(payerId);
            s.setMethod(req.method() != null ? req.method() : "portal");
            s.setStatus("in_progress");
            s.setMessage(PORTAL_MESSAGE + " (login " + login.getUsername()
                    + (login.getProviderId() == null ? ", organization)" : ", provider)"));
            s.setDocumentCount(docs);
            s.setSubmittedBy(authContext.userId());
            s.setSubmittedAt(LocalDateTime.now());
            Optional<Enrollment> enrollment = latestOpenEnrollment(enrollments, payerId);
            enrollment.ifPresent(e -> s.setEnrollmentId(e.getId()));
            PayerSubmission saved = repository.save(s);
            enrollment.ifPresent(e -> support.addEvent(e.getId(), "submission_started",
                    "Submission to " + payer.getName() + " started in the payer portal (" + docs + " documents on file)", null));
            out.add(toResponse(saved, provider, payer, users));
        }
        return new PayerSubmissionBatchResponse("portal", PORTAL_MESSAGE, out);
    }

    @Transactional(readOnly = true)
    public PageResponse<PayerSubmissionResponse> list(Long providerId, Long payerId, String status, int page, int size) {
        permissionService.require("payer_submission", "list");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Map<Long, Provider> providers = support.providerMap(orgId);
        Map<Long, Payer> payers = support.payerMap();
        Map<Long, String> users = support.userNames(orgId);
        boolean allStatuses = status == null || status.isBlank() || "all".equals(status);
        List<PayerSubmissionResponse> all = repository.findByOrgIdOrderBySubmittedAtDesc(orgId).stream()
                .filter(s -> providerId == null || providerId.equals(s.getProviderId()))
                .filter(s -> payerId == null || payerId.equals(s.getPayerId()))
                .filter(s -> allStatuses || status.equals(s.getStatus()))
                .map(s -> toResponse(s, providers.get(s.getProviderId()), payers.get(s.getPayerId()), users))
                .toList();
        return PageResponse.ofList(all, page, Math.min(Math.max(1, size), 200));
    }

    /** Record a manual outcome. payer_submission:update is empty in the default matrix, so staff writers are allowed by role. */
    @Transactional
    public PayerSubmissionResponse update(Long id, PayerSubmissionUpdateRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK);
        Long orgId = authContext.orgId();
        PayerSubmission s = repository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Submission", id));
        if (!STATUSES.contains(req.status())) throw new BadRequestException("Unknown status " + req.status());
        Payer payer = support.payer(s.getPayerId());
        s.setStatus(req.status());
        String conf = blankToNull(req.confirmationNumber());
        if (conf != null) s.setConfirmationNumber(conf);
        String msg = blankToNull(req.message());
        s.setMessage(msg != null ? msg : defaultMessage(req.status()));
        s = repository.save(s);

        if (s.getEnrollmentId() != null) {
            Enrollment e = enrollmentRepository.findByIdAndOrgId(s.getEnrollmentId(), orgId).orElse(null);
            if (e != null) {
                if ("submitted".equals(req.status()) && Set.of("draft", "in_progress", "needs_attention", "on_hold").contains(e.getStatus())) {
                    e.setStatus("submitted");
                    if (e.getSubmittedDate() == null) e.setSubmittedDate(LocalDate.now());
                    e.setTatDays(EnrollmentSupport.tat(e.getSubmittedDate(), e.getEffectiveDate()));
                    enrollmentRepository.save(e);
                    support.addEvent(e.getId(), "submitted", "Submitted to " + payer.getName() + " via " + s.getMethod()
                            + (msg == null ? "" : ": " + msg), s.getConfirmationNumber());
                } else {
                    support.addEvent(e.getId(), "submission_update", "Submission to " + payer.getName() + " marked "
                            + req.status() + (msg == null ? "" : ": " + msg), s.getConfirmationNumber());
                }
            }
        }
        Provider provider = support.provider(s.getProviderId(), orgId);
        return toResponse(s, provider, payer, support.userNames(orgId));
    }

    /**
     * Signs in to the payer's portal for this submission with the stored login (provider's own, else the organization's)
     * and records the result on the submission. Not transactional: the browser can take tens of seconds, so no database
     * transaction is held while it runs (each repository call commits on its own).
     */
    public PortalLoginResponse portalLogin(Long id) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK);
        Long orgId = authContext.orgId();
        PayerSubmission s = repository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Submission", id));
        Payer payer = support.payer(s.getPayerId());
        PayerCredential login = loginFor(orgId, support.provider(s.getProviderId(), orgId), payer);
        String password = login.getPasswordEnc() == null ? null : cryptoService.decrypt(login.getPasswordEnc());
        if (password == null) throw new BadRequestException("The " + payer.getName() + " portal login has no password");
        String portalUrl = login.getPortalUrl() != null && !login.getPortalUrl().isBlank() ? login.getPortalUrl() : payer.getPortalUrl();
        String level = login.getProviderId() == null ? "organization" : "provider";

        support.audit(orgId, "payer_credential", login.getId(), "portal_login",
                "Automatic portal sign-in to " + payer.getName() + " (submission " + id + ", " + level + " login)");
        PortalLoginService.Result r = portalLoginService.login(portalUrl, login.getUsername(), password);

        String status = switch (r.outcome()) {
            case "logged_in", "mfa_required", "captcha" -> "in_progress";
            default -> "failed";
        };
        String msg = switch (r.outcome()) {
            case "logged_in" -> "Signed in to the " + payer.getName() + " portal automatically as " + login.getUsername()
                    + (r.pageTitle() == null || r.pageTitle().isBlank() ? "" : " — page \"" + r.pageTitle() + "\"");
            default -> r.message();
        };
        s.setMethod("portal");
        s.setStatus(status);
        s.setMessage(msg.length() > 1000 ? msg.substring(0, 1000) : msg);
        PayerSubmission saved = repository.save(s);
        if (saved.getEnrollmentId() != null) {
            support.addEvent(saved.getEnrollmentId(), "portal_login", payer.getName() + " portal: " + msg, null);
        }
        Provider provider = support.provider(saved.getProviderId(), orgId);
        return new PortalLoginResponse(r.outcome(), r.message(), portalUrl, r.finalUrl(), r.pageTitle(), r.pageText(), r.screenshot(),
                r.durationMs(), login.getUsername(), level, toResponse(saved, provider, payer, support.userNames(orgId)));
    }

    /**
     * The portal login used for a provider: their own login for the payer, else the organization login — but only when the
     * provider is assigned to it.
     */
    private PayerCredential loginFor(Long orgId, Provider provider, Payer payer) {
        Optional<PayerCredential> own = credentialRepository.findByOrgIdAndProviderIdAndPayerId(orgId, provider.getId(), payer.getId())
                .filter(PayerSubmissionService::hasUsername);
        if (own.isPresent()) return own.get();
        Optional<PayerCredential> org = credentialRepository.findByOrgIdAndProviderIdIsNullAndPayerId(orgId, payer.getId())
                .filter(PayerSubmissionService::hasUsername);
        if (org.isPresent()) {
            if (org.get().appliesTo(provider.getId())) return org.get();
            throw new BadRequestException("The " + payer.getName() + " portal login is not assigned to "
                    + EnrollmentSupport.fullName(provider) + " — add them under Payers → Portal Login");
        }
        throw new BadRequestException("Add the " + payer.getName() + " portal login (Payers → Portal Login) before submitting");
    }

    private static boolean hasUsername(PayerCredential c) {
        return c.getUsername() != null && !c.getUsername().isBlank();
    }

    private static Optional<Enrollment> latestOpenEnrollment(List<Enrollment> enrollments, Long payerId) {
        return enrollments.stream()
                .filter(e -> payerId.equals(e.getPayerId()) && !"terminated".equals(e.getStatus()) && !"approved".equals(e.getStatus()))
                .max(Comparator.comparing(Enrollment::getId));
    }

    static String methodFor(Payer payer) {
        return switch (payer.getApiSupport() == null ? "portal" : payer.getApiSupport()) {
            case "full", "partial" -> "api";
            case "manual" -> "manual";
            default -> "portal";
        };
    }

    private static String defaultMessage(String status) {
        return switch (status) {
            case "in_progress" -> PORTAL_MESSAGE;
            case "submitted" -> "Submitted manually";
            case "accepted" -> "Accepted by payer";
            case "rejected" -> "Rejected by payer";
            case "failed" -> "Submission failed";
            default -> QUEUED_MESSAGE;
        };
    }

    private static PayerSubmissionResponse toResponse(PayerSubmission s, Provider provider, Payer payer, Map<Long, String> users) {
        return new PayerSubmissionResponse(s.getId(), s.getProviderId(), EnrollmentSupport.fullName(provider),
                s.getPayerId(), payer == null ? null : payer.getName(), payer == null ? null : payer.getColor(),
                s.getEnrollmentId(), s.getMethod(), s.getStatus(), s.getConfirmationNumber(), s.getMessage(),
                s.getDocumentCount(), s.getSubmittedBy(), s.getSubmittedBy() == null ? null : users.get(s.getSubmittedBy()),
                s.getSubmittedAt());
    }
}
