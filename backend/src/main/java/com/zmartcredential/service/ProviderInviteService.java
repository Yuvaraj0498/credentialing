package com.zmartcredential.service;

import com.zmartcredential.dto.provider.ProviderInviteDtos.ProviderInviteNewRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.ProviderInviteRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.ProviderInviteResponse;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicInviteInfo;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicLinkStatus;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicProfile;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicProfileRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.SecureLinkItem;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicMissingDocument;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicUploadResult;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicUploadedFile;
import com.zmartcredential.dto.provider.ProviderDocumentDtos.ProviderDocumentRow;
import com.zmartcredential.entity.DocumentType;
import com.zmartcredential.entity.EmailLog;
import com.zmartcredential.entity.EmailTemplate;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.ProviderDocument;
import com.zmartcredential.entity.ProviderInvite;
import com.zmartcredential.exception.ApiException;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.EmailLogRepository;
import com.zmartcredential.repository.EmailTemplateRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.ProviderInviteRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.zmartcredential.service.ProviderModuleSupport.blankToNull;
import static com.zmartcredential.service.ProviderModuleSupport.fullName;

/** "Send Link to Provider": secure upload invites (token + 6-digit PIN), emailed through MailService. */
@Service
@RequiredArgsConstructor
public class ProviderInviteService {

    private static final DateTimeFormatter EXPIRY_FMT = DateTimeFormatter.ofPattern("MMMM d, yyyy");

    private final ProviderInviteRepository inviteRepository;
    private final EmailRegistry emailRegistry;
    private final ProviderRepository providerRepository;
    private final EmailTemplateRepository templateRepository;
    private final EmailLogRepository emailLogRepository;
    private final OrganizationRepository organizationRepository;
    private final ProviderDocumentInitializer documentInitializer;
    private final ProviderDocumentService documentService;
    private final NotificationService notificationService;
    private final PermissionService permissionService;
    private final ProviderModuleSupport support;
    private final ProviderService providerService;
    private final com.zmartcredential.repository.AppUserRepository userRepository;
    private final OrgUserService orgUserService;
    private final MailService mailService;
    private final CryptoService cryptoService;
    private final SecureLinkIssuer linkIssuer;
    private final AuthContext authContext;

    @Transactional
    public ProviderInviteResponse invite(Long providerId, ProviderInviteRequest req) {
        permissionService.require("provider", "update");
        Provider provider = support.loadForStaff(providerId);
        if (req.clientId() != null || req.practiceId() != null || req.locationId() != null) {
            ProviderService.Hierarchy h = providerService.resolveHierarchy(provider.getOrgId(), req.clientId(),
                    req.practiceId(), req.locationId());
            provider.setClientId(h.clientId());
            provider.setPracticeId(h.practiceId());
            provider.setLocationId(h.locationId());
        }
        return createInvite(provider, req.email().trim().toLowerCase());
    }

    @Transactional
    public ProviderInviteResponse inviteNew(ProviderInviteNewRequest req) {
        permissionService.require("provider", "create");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        emailRegistry.requireFreeForProvider(req.email(), null);
        ProviderService.Hierarchy h = providerService.resolveHierarchy(orgId, req.clientId(), req.practiceId(), req.locationId());
        Provider p = new Provider();
        p.setOrgId(orgId);
        p.setFirstName(req.firstName().trim());
        p.setLastName(req.lastName().trim());
        p.setEmail(req.email().trim().toLowerCase());
        p.setCaqhId(blankToNull(req.caqhId()));
        p.setClientId(h.clientId());
        p.setPracticeId(h.practiceId());
        p.setLocationId(h.locationId());
        p.setStatus("draft");
        p.setSource("invite");
        p.setDateAdded(LocalDate.now());
        p = providerRepository.save(p);
        documentInitializer.initialize(p);
        return createInvite(p, p.getEmail());
    }

    private ProviderInviteResponse createInvite(Provider provider, String email) {
        Long orgId = provider.getOrgId();
        // the link goes to this provider: the address must not belong to anybody else
        emailRegistry.requireFreeForProvider(email, provider.getId());
        if (provider.getEmail() == null) provider.setEmail(email);
        ProviderInvite inv = linkIssuer.issue(provider, email, authContext.userId());
        String uploadUrl = SecureLinkIssuer.uploadPath(inv);

        Organization org = organizationRepository.findById(orgId).orElse(null);
        List<ProviderDocumentRow> missing = support.documentRows(provider).stream()
                .filter(r -> "missing".equals(r.status()) || "expired".equals(r.status())).toList();
        Map<String, String> vars = Map.of(
                "provider_first_name", provider.getFirstName(),
                "provider_last_name", provider.getLastName(),
                "pending_document_count", String.valueOf(missing.size()),
                "missing_document_list", missing.isEmpty() ? "(none)"
                        : String.join("\n", missing.stream().map(r -> "- " + r.label()).toList()),
                "pin", inv.getPin(),
                // emails need the full address; the API response keeps the relative path for the admin app
                "upload_link", mailService.publicUrl() + uploadUrl,
                "link_expires", inv.getExpiresAt().format(EXPIRY_FMT),
                "organization_name", org == null ? "" : org.getName());
        EmailTemplate tpl = templateRepository.findByOrgIdIsNullOrOrgId(orgId).stream()
                .filter(t -> "missing_docs".equals(t.getType()))
                .min(Comparator.comparing(t -> t.getOrgId() == null ? 1 : 0))
                .orElse(null);
        String subject = tpl == null ? "Please complete your credentialing profile" : render(tpl.getSubject(), vars);
        String body = tpl == null || tpl.getBody() == null
                ? "Hi " + provider.getFirstName() + ",\n\nPlease complete your credentialing profile and upload your documents.\n\n"
                  + "Secure Access PIN: " + inv.getPin() + "\n\nOpen your secure link: " + vars.get("upload_link")
                  + "\n\nLink expires: " + vars.get("link_expires")
                : render(tpl.getBody(), vars);

        MailService.Result mail = mailService.send(email, subject, body);
        EmailLog log = new EmailLog();
        log.setOrgId(orgId);
        log.setProviderId(provider.getId());
        log.setToEmail(email);
        log.setSubject(subject.length() > 255 ? subject.substring(0, 255) : subject);
        log.setStatus(mail.status());
        emailLogRepository.save(log);

        String how = switch (mail.status()) {
            case "sent" -> " emailed to ";
            case "failed" -> " could not be emailed to ";
            default -> " queued to ";
        };
        notificationService.notifyOrg(orgId, "Secure link sent",
                "Upload link for " + fullName(provider) + how + email + ".", "Send",
                mail.sent() || "queued".equals(mail.status()) ? NotificationService.INFO : NotificationService.WARN);
        return new ProviderInviteResponse(inv.getId(), provider.getId(), fullName(provider), email, inv.getPin(),
                inv.getExpiresAt(), uploadUrl, mail.status(), mail.error());
    }

    private static String render(String text, Map<String, String> vars) {
        String out = text;
        for (Map.Entry<String, String> e : vars.entrySet()) {
            out = out.replace("{{" + e.getKey() + "}}", e.getValue() == null ? "" : e.getValue());
        }
        return out;
    }

    // ---------- admin: Secure Links ----------

    @Transactional(readOnly = true)
    public List<SecureLinkItem> list() {
        permissionService.require("provider", "read");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        List<ProviderInvite> invites = inviteRepository.findByOrgId(orgId);
        Map<Long, Provider> providers = new java.util.HashMap<>();
        providerRepository.findAllById(invites.stream().map(ProviderInvite::getProviderId).distinct().toList())
                .forEach(p -> providers.put(p.getId(), p));
        LocalDateTime now = LocalDateTime.now();
        return invites.stream()
                .sorted(Comparator.comparing(ProviderInvite::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(inv -> {
                    Provider p = providers.get(inv.getProviderId());
                    return new SecureLinkItem(inv.getId(), inv.getProviderId(), p == null ? inv.getEmail() : fullName(p),
                            inv.getEmail(), inv.getPin(), linkStatus(inv, now), attempts(inv), maxAttempts(inv),
                            "/admin/upload/" + inv.getToken(), inv.getCreatedAt(), inv.getExpiresAt(), inv.getAccessedAt(),
                            inv.getSubmittedAt());
                })
                .toList();
    }

    @Transactional
    public void delete(Long id) {
        permissionService.require("provider", "update");
        authContext.requireStaff();
        ProviderInvite inv = inviteRepository.findByIdAndOrgId(id, authContext.orgId())
                .orElseThrow(() -> new NotFoundException("Secure link not found"));
        inviteRepository.delete(inv);
    }

    /** pending | accessed | submitted | expired | locked | replaced */
    private static String linkStatus(ProviderInvite inv, LocalDateTime now) {
        String s = inv.getStatus();
        if ("submitted".equals(s) || "completed".equals(s)) return "submitted";
        if ("revoked".equals(s)) return "replaced";
        if ("expired".equals(s) || inv.getExpiresAt().isBefore(now)) return "expired";
        if (attempts(inv) >= maxAttempts(inv)) return "locked";
        return "opened".equals(s) ? "accessed" : "pending";
    }

    private static int attempts(ProviderInvite inv) {
        return inv.getAttempts() == null ? 0 : inv.getAttempts();
    }

    private static int maxAttempts(ProviderInvite inv) {
        return inv.getMaxAttempts() == null ? 5 : inv.getMaxAttempts();
    }

    // ---------- public (token + PIN) ----------

    /** What the portal shows before the PIN is entered (no provider data beyond the first name). */
    @Transactional(readOnly = true)
    public PublicLinkStatus status(String token) {
        ProviderInvite inv = findByToken(token);
        String state = switch (linkStatus(inv, LocalDateTime.now())) {
            case "submitted" -> "submitted";
            case "replaced" -> "replaced";
            case "expired" -> "expired";
            case "locked" -> "locked";
            default -> "active";
        };
        String firstName = providerRepository.findById(inv.getProviderId()).map(Provider::getFirstName).orElse(null);
        String orgName = organizationRepository.findById(inv.getOrgId()).map(Organization::getName).orElse(null);
        return new PublicLinkStatus(state, firstName, orgName, inv.getExpiresAt(),
                Math.max(0, maxAttempts(inv) - attempts(inv)), inv.getSubmittedAt());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public PublicInviteInfo verify(String token, String pin) {
        ProviderInvite inv = checkInvite(token, pin);
        if ("sent".equals(inv.getStatus())) inv.setStatus("opened");
        if (inv.getAccessedAt() == null) inv.setAccessedAt(LocalDateTime.now());
        Provider provider = providerRepository.findById(inv.getProviderId())
                .orElseThrow(() -> new NotFoundException("This link is no longer valid"));
        String orgName = organizationRepository.findById(inv.getOrgId()).map(Organization::getName).orElse(null);
        PublicProfile profile = new PublicProfile(provider.getNpi(), provider.getCaqhId(), provider.getSuffix(),
                provider.getSpecialty(), provider.getPhone(), provider.getDateOfBirth(), provider.getLicenseNumber(),
                provider.getLicenseState(), provider.getLicenseExpires(), provider.getDeaNumber(), provider.getDeaExpires(),
                userRepository.findByProviderId(provider.getId()).isPresent(), provider.getEmail());
        return new PublicInviteInfo(fullName(provider), orgName, inv.getEmail(), missing(provider), inv.getExpiresAt(),
                provider.getFirstName(), provider.getLastName(), profile);
    }

    /** Portal "Review & Submit": saves the provider's professional details and closes the link. */
    @Transactional(noRollbackFor = ApiException.class)
    public PublicLinkStatus submitProfile(String token, PublicProfileRequest req) {
        ProviderInvite inv = checkInvite(token, req.pin());
        Provider p = providerRepository.findById(inv.getProviderId())
                .orElseThrow(() -> new NotFoundException("This link is no longer valid"));
        String npi = req.npi().trim();
        providerRepository.findByOrgIdAndNpi(p.getOrgId(), npi)
                .filter(other -> !Objects.equals(other.getId(), p.getId()))
                .ifPresent(other -> {
                    throw new ConflictException("NPI " + npi + " is already registered with this organization");
                });
        // Same requirements as adding a provider in the admin app (name, email, practice and location were set by staff).
        java.util.List<String> missing = new java.util.ArrayList<>();
        if (blankToNull(req.suffix()) == null) missing.add("Suffix");
        if (blankToNull(req.specialty()) == null) missing.add("Specialty");
        if (blankToNull(req.phone()) == null) missing.add("Phone");
        else if (!com.zmartcredential.util.PhoneNumber.isValid(req.phone())) throw BadRequestException.onField("phone", com.zmartcredential.util.PhoneNumber.MESSAGE);
        if (blankToNull(req.licenseState()) == null) missing.add("License State");
        if (req.licenseExpires() == null) missing.add("License Expiration");
        else if (req.licenseExpires().isBefore(java.time.LocalDate.now())) throw new BadRequestException("License Expiration can't be in the past");
        if (req.deaExpires() != null && req.deaExpires().isBefore(java.time.LocalDate.now())) throw new BadRequestException("DEA Expiration can't be in the past");
        if (blankToNull(req.caqhUsername()) == null) missing.add("CAQH Username");
        if (blankToNull(req.caqhPassword()) == null && p.getCaqhPasswordEnc() == null) missing.add("CAQH Password");
        if (req.pecosAccessGranted() == null) missing.add("PECOS Access Granted");
        else if (req.pecosAccessGranted() && blankToNull(req.pecosUsername()) == null) missing.add("PECOS User Name");
        if (!missing.isEmpty()) throw new BadRequestException("Required: " + String.join(", ", missing));
        p.setNpi(npi);
        if (blankToNull(req.caqhId()) != null) p.setCaqhId(req.caqhId().trim());
        p.setCaqhUsername(req.caqhUsername().trim());
        if (blankToNull(req.caqhPassword()) != null) p.setCaqhPasswordEnc(cryptoService.encrypt(req.caqhPassword()));
        p.setPecosAccessGranted(req.pecosAccessGranted());
        p.setPecosUsername(req.pecosAccessGranted() ? req.pecosUsername().trim() : null);
        p.setSuffix(blankToNull(req.suffix()));
        p.setSpecialty(blankToNull(req.specialty()));
        p.setPhone(blankToNull(req.phone()));
        p.setDateOfBirth(req.dateOfBirth());
        p.setLicenseNumber(req.licenseNumber().trim());
        String state = blankToNull(req.licenseState());
        p.setLicenseState(state == null ? null : state.toUpperCase());
        p.setLicenseExpires(req.licenseExpires());
        String dea = blankToNull(req.deaNumber());
        p.setDeaNumber(dea == null ? null : dea.toUpperCase());
        p.setDeaExpires(req.deaExpires());
        if ("draft".equals(p.getStatus()) || "pending".equals(p.getStatus())) p.setStatus("active");
        // the provider's sign-in: their email + the password they chose (when they have no login yet)
        if (userRepository.findByProviderId(p.getId()).isEmpty()) {
            if (req.password() == null || req.password().length() < 8) {
                throw com.zmartcredential.exception.BadRequestException.onField("password", "Choose a password of at least 8 characters");
            }
            orgUserService.createProviderLogin(p.getId(), req.password(), null);
        }
        inv.setStatus("submitted");
        inv.setSubmittedAt(LocalDateTime.now());
        notificationService.notifyOrg(p.getOrgId(), "Provider profile submitted",
                fullName(p) + " completed their profile through a secure link.", "UserCheck", NotificationService.SUCCESS);
        return status(token);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public PublicUploadResult publicUpload(String token, String pin, List<MultipartFile> files, List<String> docTypes,
                                           List<String> expiresAts) {
        ProviderInvite inv = checkInvite(token, pin);
        Provider provider = providerRepository.findById(inv.getProviderId())
                .orElseThrow(() -> new NotFoundException("This link is no longer valid"));
        if (files == null || files.isEmpty()) throw new BadRequestException("Choose at least one file to upload");
        if (docTypes == null || docTypes.size() < files.size()) {
            throw new BadRequestException("Choose a document type for each file");
        }
        Map<String, DocumentType> types = support.docTypes();
        for (int i = 0; i < files.size(); i++) {
            String code = blankToNull(docTypes.get(i));
            if (code == null || !types.containsKey(code)) {
                throw new BadRequestException("Choose a valid document type for " + files.get(i).getOriginalFilename());
            }
            if (files.get(i) == null || files.get(i).isEmpty()) {
                throw new BadRequestException("File " + (i + 1) + " is empty");
            }
        }
        for (int i = 0; files != null && i < files.size(); i++) {
            LocalDate given = ProviderDocumentService.parseDate(expiresAts != null && i < expiresAts.size() ? expiresAts.get(i) : null);
            if (given != null && given.isBefore(LocalDate.now())) throw new BadRequestException("Expiration dates can't be in the past");
        }
        List<PublicUploadedFile> uploaded = new ArrayList<>();
        for (int i = 0; i < files.size(); i++) {
            LocalDate exp = ProviderDocumentService.parseDate(
                    expiresAts != null && i < expiresAts.size() ? expiresAts.get(i) : null);
            ProviderDocument d = documentService.storeInto(provider, docTypes.get(i).trim(), files.get(i), exp,
                    false, null, null);
            uploaded.add(new PublicUploadedFile(d.getFileName(), d.getDocType(), types.get(d.getDocType()).getLabel(),
                    d.getExpiresAt()));
        }
        // the link stays open until the provider submits the profile (status "submitted")
        List<PublicMissingDocument> stillMissing = missing(provider);
        documentService.notifyUpload(provider, uploaded.size(), "Documents received via secure link");
        return new PublicUploadResult(uploaded, stillMissing);
    }

    private ProviderInvite findByToken(String token) {
        if (token == null || token.length() != 64) throw new NotFoundException("This link is not valid");
        return inviteRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("This link is not valid"));
    }

    /** Callers must not roll back on ApiException, so failed attempts and expiry are persisted. */
    private ProviderInvite checkInvite(String token, String pin) {
        ProviderInvite inv = findByToken(token);
        if ("revoked".equals(inv.getStatus())) {
            throw new BadRequestException("This link has been replaced by a newer one. Please use the latest email.");
        }
        if ("submitted".equals(inv.getStatus())) {
            throw new BadRequestException("This profile has already been submitted. Contact your credentialing team for changes.");
        }
        if (inv.getExpiresAt().isBefore(LocalDateTime.now())) {
            if (!"expired".equals(inv.getStatus())) inv.setStatus("expired");
            throw new BadRequestException("This link has expired. Please contact your credentialing team for a new one.");
        }
        if (attempts(inv) >= maxAttempts(inv)) {
            throw new BadRequestException("This link is locked after too many incorrect PIN attempts. Contact your credentialing team for a new one.");
        }
        if (pin == null || !java.security.MessageDigest.isEqual(pin.trim().getBytes(), inv.getPin().getBytes())) {
            inv.setAttempts(attempts(inv) + 1);
            int left = maxAttempts(inv) - attempts(inv);
            throw new BadRequestException(left > 0
                    ? "Incorrect PIN. " + left + " attempt(s) remaining."
                    : "Incorrect PIN. This link is now locked; contact your credentialing team for a new one.");
        }
        return inv;
    }

    private List<PublicMissingDocument> missing(Provider provider) {
        return support.documentRows(provider).stream()
                .filter(r -> !"approved".equals(r.status()) && !"na".equals(r.status()))
                .filter(r -> !Objects.equals(r.status(), "pending_review"))
                .map(r -> new PublicMissingDocument(r.docType(), r.label(), r.critical(), r.expires(), r.status()))
                .toList();
    }
}
