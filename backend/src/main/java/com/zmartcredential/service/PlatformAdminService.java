package com.zmartcredential.service;

import com.zmartcredential.dto.auth.OrgSignupRequest;
import com.zmartcredential.dto.auth.PlatformDtos.AdminSummary;
import com.zmartcredential.dto.auth.PlatformDtos.PlatformSummary;
import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.Subscription;
import com.zmartcredential.entity.SubscriptionPackage;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.repository.SubscriptionPackageRepository;
import com.zmartcredential.repository.SubscriptionRepository;
import com.zmartcredential.repository.UserRoleRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Super admin: dashboard counts and "Create Admin". Creating an admin follows the organization sign-up workflow
 * (organization → admin account → plan → payment) and creates a new organization with its admin user, who has
 * access to every module of that organization.
 */
@Service
@RequiredArgsConstructor
public class PlatformAdminService {

    private final AuthService authService;
    private final AppUserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ProviderRepository providerRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPackageRepository packageRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public PlatformSummary summary() {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        List<AdminSummary> admins = admins();
        long staff = userRepository.findAll().stream()
                .filter(u -> u.getOrgId() != null && !Role.PROVIDER.code().equals(u.getRole())).count();
        return new PlatformSummary(organizationRepository.count(), admins.size(), staff, providerRepository.count(),
                userRoleRepository.count(), admins.stream().limit(5).toList());
    }

    /** All organization admins, newest first. */
    @Transactional(readOnly = true)
    public List<AdminSummary> listAdmins() {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        return admins();
    }

    @Transactional
    public AdminSummary createAdmin(OrgSignupRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        AppUser admin = authService.createOrganizationWithAdmin(req, false);
        return admins().stream().filter(a -> a.userId().equals(admin.getId())).findFirst().orElseThrow();
    }

    private List<AdminSummary> admins() {
        Map<Long, Organization> orgs = organizationRepository.findAll().stream()
                .collect(Collectors.toMap(Organization::getId, Function.identity()));
        Map<Long, Long> providers = counts(providerRepository.countGroupedByOrg());
        Map<Long, Long> users = counts(userRepository.countGroupedByOrg());
        Map<Long, Subscription> subs = subscriptionRepository.findAll().stream()
                .collect(Collectors.toMap(Subscription::getOrgId, Function.identity(), (a, b) -> a));
        Map<String, String> plans = packageRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPackage::getCode, SubscriptionPackage::getName));
        return userRepository.findAll().stream()
                // only each organization's own admin (created through Create Admin / sign-up)
                .filter(u -> u.getOrgId() != null && Boolean.TRUE.equals(u.getOrgOwner()))
                .sorted(Comparator.comparing(AppUser::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(u -> {
                    Organization o = orgs.get(u.getOrgId());
                    Subscription s = subs.get(u.getOrgId());
                    return new AdminSummary(u.getId(), u.getDisplayName(), u.getEmail(), u.getPhone(), u.getOrgId(),
                            o == null ? null : o.getName(), o == null ? null : o.getStatus(),
                            s == null ? null : plans.get(s.getPackageCode()),
                            providers.getOrDefault(u.getOrgId(), 0L), users.getOrDefault(u.getOrgId(), 0L),
                            Boolean.TRUE.equals(u.getDisabled()), u.getCreatedAt());
                })
                .toList();
    }

    private static Map<Long, Long> counts(List<Object[]> rows) {
        Map<Long, Long> out = new HashMap<>();
        for (Object[] r : rows) out.put((Long) r[0], (Long) r[1]);
        return out;
    }
}
