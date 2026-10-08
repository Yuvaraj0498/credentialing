package com.zmartcredential.service;

import com.zmartcredential.dto.organization.AdminOrgDtos.AdminOrganizationCreateRequest;
import com.zmartcredential.dto.organization.AdminOrgDtos.AdminOrganizationResponse;
import com.zmartcredential.dto.organization.AdminOrgDtos.FirstAdmin;
import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.AuditLog;
import com.zmartcredential.entity.ChatChannel;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.Subscription;
import com.zmartcredential.entity.SubscriptionPackage;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.AuditLogRepository;
import com.zmartcredential.repository.ChatChannelRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.repository.RefreshTokenRepository;
import com.zmartcredential.repository.SubscriptionPackageRepository;
import com.zmartcredential.repository.SubscriptionRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.zmartcredential.service.OrgLocationService.blankToNull;
import static com.zmartcredential.service.OrgLocationService.countMap;

/** Platform admin: tenant list, creation and suspension. Role platform_admin only. */
@Service
@RequiredArgsConstructor
public class PlatformOrgAdminService {

    private final OrganizationRepository organizationRepository;
    private final EmailRegistry emailRegistry;
    private final AppUserRepository userRepository;
    private final ProviderRepository providerRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPackageRepository packageRepository;
    private final ChatChannelRepository chatChannelRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final OrgStructureService structureService;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public List<AdminOrganizationResponse> list() {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        Map<Long, Long> users = countMap(userRepository.countGroupedByOrg());
        Map<Long, Long> providers = countMap(providerRepository.countGroupedByOrg());
        Map<Long, Subscription> subs = subscriptionRepository.findAll().stream()
                .collect(Collectors.toMap(Subscription::getOrgId, Function.identity(), (a, b) -> a));
        Map<String, SubscriptionPackage> pkgs = packageRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPackage::getCode, Function.identity()));
        return organizationRepository.findAll().stream()
                .sorted(Comparator.comparing(o -> o.getName().toLowerCase(Locale.ROOT)))
                .map(o -> toResponse(o, users, providers, subs, pkgs))
                .toList();
    }

    @Transactional
    public AdminOrganizationResponse create(AdminOrganizationCreateRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        SubscriptionPackage pkg = null;
        if (req.packageCode() != null && !req.packageCode().isBlank()) {
            pkg = packageRepository.findById(req.packageCode())
                    .filter(p -> Boolean.TRUE.equals(p.getActive()))
                    .orElseThrow(() -> new BadRequestException("Unknown subscription package"));
        }
        FirstAdmin a = req.admin();
        String adminEmail = a == null ? null : a.email().trim().toLowerCase(Locale.ROOT);
        if (adminEmail != null && (userRepository.existsByEmail(adminEmail) || userRepository.existsByUsername(adminEmail))) {
            throw ConflictException.onField("email", "An account with this email already exists");
        }
        String orgEmail = req.email() == null || req.email().isBlank() ? adminEmail : req.email().trim().toLowerCase(Locale.ROOT);
        emailRegistry.requireFreeForOrganization(orgEmail, null);
        if (adminEmail != null && !adminEmail.equals(orgEmail)) emailRegistry.requireFreeForOrganization(adminEmail, null);

        Organization org = new Organization();
        org.setName(req.name().trim());
        org.setOrgType(blankToNull(req.orgType()));
        org.setTaxId(blankToNull(req.taxId()));
        org.setWebsite(blankToNull(req.website()));
        org.setAddress(blankToNull(req.address()));
        org.setCity(blankToNull(req.city()));
        org.setState(blankToNull(req.state()));
        org.setZip(blankToNull(req.zip()));
        org.setPhone(blankToNull(req.phone()));
        org.setEmail(req.email() == null || req.email().isBlank() ? adminEmail : req.email().trim().toLowerCase(Locale.ROOT));
        org.setStatus("active");
        org.setSelfSignup(false);
        org.setInviteCode(structureService.newInviteCode());
        org = organizationRepository.save(org);

        if (pkg != null) {
            Subscription sub = new Subscription();
            sub.setOrgId(org.getId());
            sub.setPackageCode(pkg.getCode());
            sub.setProviderCount(req.estimatedProviders() == null ? 0 : req.estimatedProviders());
            sub.setStatus("active");
            sub.setStartedAt(LocalDateTime.now());
            sub.setNextRenewalDate(LocalDate.now().plusDays(30));
            subscriptionRepository.save(sub);
        }

        Long adminId = null;
        if (a != null) {
            AppUser u = new AppUser();
            u.setOrgId(org.getId());
            u.setUsername(adminEmail);
            u.setEmail(adminEmail);
            u.setPasswordHash(passwordEncoder.encode(a.password()));
            u.setFirstName(a.firstName().trim());
            u.setLastName(a.lastName().trim());
            u.setDisplayName(u.getFirstName() + " " + u.getLastName());
            u.setTitle(blankToNull(a.title()) == null ? "Org Admin" : a.title().trim());
            u.setPhone(blankToNull(a.phone()));
            u.setRole(Role.ORG_ADMIN.code());
            adminId = userRepository.save(u).getId();
            notificationService.notifyUser(org.getId(), adminId, "Welcome to ZmartCredential!",
                    "Your organization account has been created by ZmartCredential.", "PartyPopper",
                    NotificationService.ACCENT);
        }
        createDefaultChannels(org.getId(), adminId);
        audit(org.getId(), "create", "Organization created: " + org.getName());

        return toResponse(org, Map.of(org.getId(), adminId == null ? 0L : 1L), Map.of(),
                pkg == null ? Map.of() : Map.of(org.getId(), subscriptionRepository.findByOrgId(org.getId()).orElseThrow()),
                pkg == null ? Map.of() : Map.of(pkg.getCode(), pkg));
    }

    @Transactional
    public AdminOrganizationResponse setStatus(Long id, String status) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        Organization org = organizationRepository.findById(id).orElseThrow(() -> NotFoundException.of("Organization", id));
        String previous = org.getStatus();
        org.setStatus(status);
        organizationRepository.save(org);
        if ("suspended".equals(status) && !"suspended".equals(previous)) {
            // Existing sessions cannot be refreshed; access tokens expire on their own shortly.
            refreshTokenRepository.revokeAllForOrg(id, LocalDateTime.now());
        }
        audit(id, "status", "Organization status changed from " + previous + " to " + status);
        Organization fresh = organizationRepository.findById(id).orElseThrow();
        Map<Long, Subscription> subs = subscriptionRepository.findByOrgId(id).map(s -> Map.of(id, s)).orElse(Map.of());
        Map<String, SubscriptionPackage> pkgs = packageRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPackage::getCode, Function.identity()));
        return toResponse(fresh, countMap(userRepository.countGroupedByOrg()),
                countMap(providerRepository.countGroupedByOrg()), subs, pkgs);
    }

    private AdminOrganizationResponse toResponse(Organization o, Map<Long, Long> users, Map<Long, Long> providers,
                                                 Map<Long, Subscription> subs, Map<String, SubscriptionPackage> pkgs) {
        Subscription s = subs.get(o.getId());
        SubscriptionPackage p = s == null ? null : pkgs.get(s.getPackageCode());
        return new AdminOrganizationResponse(o.getId(), o.getName(), o.getOrgType(), o.getCity(), o.getState(),
                o.getEmail(), o.getPhone(), o.getStatus(), Boolean.TRUE.equals(o.getSelfSignup()), o.getInviteCode(),
                users.getOrDefault(o.getId(), 0L), providers.getOrDefault(o.getId(), 0L),
                s == null ? null : s.getPackageCode(), p == null ? null : p.getName(),
                s == null ? null : s.getStatus(), o.getCreatedAt());
    }

    private void createDefaultChannels(Long orgId, Long userId) {
        String[][] defaults = {
                {"general", "Company-wide discussion", "Hash"},
                {"credentialing", "Credentialing workflows and questions", "ShieldCheck"},
                {"payers", "Payer updates, portal issues, submission notes", "CreditCard"},
                {"announcements", "Important company announcements", "Megaphone"}};
        for (String[] d : defaults) {
            if (chatChannelRepository.existsByOrgIdAndName(orgId, d[0])) continue;
            ChatChannel ch = new ChatChannel();
            ch.setOrgId(orgId);
            ch.setName(d[0]);
            ch.setDescription(d[1]);
            ch.setIcon(d[2]);
            ch.setCreatedBy(userId);
            chatChannelRepository.save(ch);
        }
    }

    private void audit(Long orgId, String action, String summary) {
        AuditLog log = new AuditLog();
        log.setOrgId(orgId);
        log.setUserId(authContext.userId());
        log.setEntity("organization");
        log.setEntityId(orgId);
        log.setAction(action);
        log.setSummary(summary);
        log.setCreatedAt(LocalDateTime.now());
        auditLogRepository.save(log);
    }
}
