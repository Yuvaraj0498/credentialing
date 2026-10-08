package com.zmartcredential.service;

import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationAlertSettings;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationAlertsResponse;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationItem;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationNotifyRequest;
import com.zmartcredential.dto.credentialing.OpsHubDtos.ExpirationStats;
import com.zmartcredential.dto.credentialing.OpsHubDtos.QueuedResponse;
import com.zmartcredential.entity.DocumentType;
import com.zmartcredential.entity.ExpirationAlertConfig;
import com.zmartcredential.entity.ExpirationAlertDocType;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.ProviderDocument;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.DocumentTypeRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.ExpirationAlertConfigRepository;
import com.zmartcredential.repository.ExpirationAlertDocTypeRepository;
import com.zmartcredential.repository.ProviderDocumentRepository;
import com.zmartcredential.security.AuthContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Document expiration alert settings and the computed alert list (DocExpirationAlertsView). */
@Service
@RequiredArgsConstructor
public class OpsExpirationAlertService {

    public static final List<String> DEFAULT_DOC_TYPES =
            List.of("dea", "medical_license", "malpractice", "board_cert", "csr_license", "clia", "gov_id");
    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US);

    private final ExpirationAlertConfigRepository configRepository;
    private final ExpirationAlertDocTypeRepository docTypeRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final ProviderDocumentRepository documentRepository;
    private final OpsEmailReminderService emailService;
    private final OrganizationRepository organizationRepository;
    private final NotificationService notificationService;
    private final OpsLookupService lookup;
    private final AuthContext authContext;

    @Transactional
    public ExpirationAlertSettings getSettings() {
        authContext.requireStaff();
        return toSettings(ensureConfig(authContext.orgId()));
    }

    @Transactional
    public ExpirationAlertSettings updateSettings(ExpirationAlertSettings req) {
        lookup.requireWriter();
        Long orgId = authContext.orgId();
        if (req.criticalDays() >= req.warningDays()) {
            throw new BadRequestException("Critical threshold must be lower than the warning threshold");
        }
        if (req.warningDays() >= req.infoDays()) {
            throw new BadRequestException("Warning threshold must be lower than the heads-up threshold");
        }
        Map<String, DocumentType> types = documentTypeRepository.findAll().stream()
                .collect(Collectors.toMap(DocumentType::getCode, t -> t));
        Set<String> docTypes = new LinkedHashSet<>();
        for (String code : req.docTypes()) {
            DocumentType t = types.get(code);
            if (t == null) throw new BadRequestException("Unknown document type: " + code);
            if (!Boolean.TRUE.equals(t.getExpires())) throw new BadRequestException(t.getLabel() + " does not expire and cannot be monitored");
            docTypes.add(code);
        }
        ExpirationAlertConfig c = ensureConfig(orgId);
        c.setEnabled(req.enabled());
        c.setCriticalDays(req.criticalDays());
        c.setWarningDays(req.warningDays());
        c.setInfoDays(req.infoDays());
        c.setNotifyEmail(req.notifyEmail());
        c.setNotifyDashboard(req.notifyDashboard());
        c.setCadence(req.cadence());
        configRepository.save(c);
        docTypeRepository.deleteByOrgId(orgId);
        docTypeRepository.flush();
        for (String code : docTypes) docTypeRepository.save(docType(orgId, code));
        return toSettings(c, new ArrayList<>(docTypes));
    }

    @Transactional
    public ExpirationAlertsResponse alerts(String tier) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        ExpirationAlertConfig c = ensureConfig(orgId);
        ExpirationAlertSettings settings = toSettings(c);
        if (!Boolean.TRUE.equals(c.getEnabled())) {
            return new ExpirationAlertsResponse(false, settings, new ExpirationStats(0, 0, 0, 0), List.of());
        }
        List<ExpirationItem> all = computeItems(orgId, c, settings.docTypes());
        ExpirationStats stats = new ExpirationStats(
                all.stream().filter(i -> "expired".equals(i.tier())).count(),
                all.stream().filter(i -> "critical".equals(i.tier())).count(),
                all.stream().filter(i -> "warning".equals(i.tier())).count(),
                all.stream().filter(i -> "info".equals(i.tier())).count());
        List<ExpirationItem> items = tier == null || tier.isBlank() || "all".equals(tier) ? all
                : all.stream().filter(i -> tier.equals(i.tier())).toList();
        return new ExpirationAlertsResponse(true, settings, stats, items);
    }

    @Transactional
    public QueuedResponse notifyProvider(ExpirationNotifyRequest req) {
        lookup.requireWriter();
        Long orgId = authContext.orgId();
        Provider p = lookup.requireProvider(orgId, req.providerId());
        if (p.getEmail() == null || p.getEmail().isBlank()) {
            throw new BadRequestException("This provider has no email address on file");
        }
        DocumentType dt = documentTypeRepository.findById(req.docType())
                .orElseThrow(() -> new BadRequestException("Unknown document type: " + req.docType()));
        LocalDate expires = expiryFor(p, req.docType());
        if (expires == null) throw new NotFoundException("No expiration date is on file for this document");
        LocalDate today = LocalDate.now();
        String subject = expires.isBefore(today)
                ? "Action required: your " + dt.getLabel() + " expired on " + SHORT_DATE.format(expires)
                : "Reminder: your " + dt.getLabel() + " expires on " + SHORT_DATE.format(expires);
        boolean expired = expires.isBefore(today);
        String org = organizationRepository.findById(orgId).map(o -> o.getName()).orElse("your credentialing team");
        String body = "Hi " + p.getFirstName() + ",\n\n"
                + (expired
                    ? "Our records show that your " + dt.getLabel() + " expired on " + SHORT_DATE.format(expires) + "."
                    : "Your " + dt.getLabel() + " expires on " + SHORT_DATE.format(expires) + ".")
                + "\n\nPlease send us the renewed document as soon as possible so your credentialing and payer enrollments stay active."
                + "\n\nThank you,\n" + org;
        MailService.Result r = emailService.deliver(orgId, p, null, subject, body);
        String what = switch (r.status()) {
            case "sent" -> "Expiration notice emailed";
            case "failed" -> "Expiration notice could not be emailed";
            default -> "Expiration notice recorded";
        };
        notificationService.notifyOrg(orgId, what,
                OpsLookupService.plainName(p) + " — " + dt.getLabel() + " (" + SHORT_DATE.format(expires) + ")",
                "Mail", "failed".equals(r.status()) ? NotificationService.WARN : NotificationService.INFO);
        return switch (r.status()) {
            case "sent" -> new QueuedResponse(1, "smtp", "Notice emailed to " + p.getEmail() + ".");
            case "failed" -> new QueuedResponse(1, "failed", "The notice could not be emailed: " + r.error());
            default -> new QueuedResponse(1, "deferred",
                    "Email sending is switched off on this server, so the notice was only recorded in the email log.");
        };
    }

    // ---------------------------------------------------------------- helpers

    private List<ExpirationItem> computeItems(Long orgId, ExpirationAlertConfig c, List<String> monitored) {
        LocalDate today = LocalDate.now();
        Set<String> watch = new LinkedHashSet<>(monitored);
        Map<String, String> labels = documentTypeRepository.findAll().stream()
                .collect(Collectors.toMap(DocumentType::getCode, DocumentType::getLabel));
        Map<Long, Provider> providers = lookup.providersById(orgId);
        // key providerId:docType -> expiry (+source)
        Map<String, Object[]> found = new HashMap<>();
        for (ProviderDocument d : documentRepository.findByOrgId(orgId)) {
            if (!watch.contains(d.getDocType()) || d.getExpiresAt() == null) continue;
            if ("missing".equals(d.getStatus()) || "na".equals(d.getStatus())) continue;
            if (!providers.containsKey(d.getProviderId())) continue;
            found.put(d.getProviderId() + ":" + d.getDocType(), new Object[]{d.getExpiresAt(), "document"});
        }
        for (Provider p : providers.values()) {
            if (watch.contains("medical_license") && p.getLicenseExpires() != null) {
                found.putIfAbsent(p.getId() + ":medical_license", new Object[]{p.getLicenseExpires(), "provider_profile"});
            }
            if (watch.contains("dea") && p.getDeaExpires() != null) {
                found.putIfAbsent(p.getId() + ":dea", new Object[]{p.getDeaExpires(), "provider_profile"});
            }
        }
        List<ExpirationItem> items = new ArrayList<>();
        found.forEach((key, val) -> {
            int idx = key.indexOf(':');
            Long pid = Long.valueOf(key.substring(0, idx));
            String docType = key.substring(idx + 1);
            LocalDate expires = (LocalDate) val[0];
            long days = ChronoUnit.DAYS.between(today, expires);
            String tier = tierFor(days, c);
            if (tier == null) return;
            Provider p = providers.get(pid);
            items.add(new ExpirationItem(pid, OpsLookupService.plainName(p), p.getEmail(), docType,
                    labels.getOrDefault(docType, docType), expires, days, tier, (String) val[1]));
        });
        items.sort(Comparator.comparingLong(ExpirationItem::daysLeft).thenComparing(ExpirationItem::providerName));
        return items;
    }

    private LocalDate expiryFor(Provider p, String docType) {
        LocalDate fromDoc = documentRepository.findByProviderIdAndDocType(p.getId(), docType)
                .filter(d -> !"missing".equals(d.getStatus()) && !"na".equals(d.getStatus()))
                .map(ProviderDocument::getExpiresAt).orElse(null);
        if (fromDoc != null) return fromDoc;
        if ("medical_license".equals(docType)) return p.getLicenseExpires();
        if ("dea".equals(docType)) return p.getDeaExpires();
        return null;
    }

    static String tierFor(long days, ExpirationAlertConfig c) {
        if (days < 0) return "expired";
        if (days <= c.getCriticalDays()) return "critical";
        if (days <= c.getWarningDays()) return "warning";
        if (days <= c.getInfoDays()) return "info";
        return null;
    }

    private ExpirationAlertConfig ensureConfig(Long orgId) {
        return configRepository.findById(orgId).orElseGet(() -> {
            ExpirationAlertConfig c = new ExpirationAlertConfig();
            c.setOrgId(orgId);
            configRepository.saveAndFlush(c);
            Set<String> existing = documentTypeRepository.findAll().stream().map(DocumentType::getCode).collect(Collectors.toSet());
            for (String code : DEFAULT_DOC_TYPES) {
                if (existing.contains(code)) docTypeRepository.save(docType(orgId, code));
            }
            docTypeRepository.flush();
            return c;
        });
    }

    private ExpirationAlertSettings toSettings(ExpirationAlertConfig c) {
        List<String> types = docTypeRepository.findByOrgId(c.getOrgId()).stream().map(ExpirationAlertDocType::getDocType).toList();
        return toSettings(c, types);
    }

    private static ExpirationAlertSettings toSettings(ExpirationAlertConfig c, List<String> types) {
        return new ExpirationAlertSettings(Boolean.TRUE.equals(c.getEnabled()), c.getCriticalDays(), c.getWarningDays(),
                c.getInfoDays(), Boolean.TRUE.equals(c.getNotifyEmail()), Boolean.TRUE.equals(c.getNotifyDashboard()),
                c.getCadence(), types);
    }

    private static ExpirationAlertDocType docType(Long orgId, String code) {
        ExpirationAlertDocType t = new ExpirationAlertDocType();
        t.setOrgId(orgId);
        t.setDocType(code);
        return t;
    }
}
