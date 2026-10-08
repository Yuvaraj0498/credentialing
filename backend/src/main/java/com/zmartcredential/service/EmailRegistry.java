package com.zmartcredential.service;

import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.Role;
import java.util.Locale;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * One email address = one person, across every role: organizations, users (admins, clerks, auditors, any user
 * role), and providers. The only records allowed to share an address are the ones that are the same person:
 * a provider and their own login (app_user.provider_id), and an organization and its own admin login.
 */
@Component
@RequiredArgsConstructor
public class EmailRegistry {

    private final AppUserRepository userRepository;
    private final ProviderRepository providerRepository;
    private final OrganizationRepository organizationRepository;

    /** For a user account. userId: the user being saved (null = new); providerId: the provider it belongs to;
     *  adminOfOrgId: the organization when the user is that organization's admin. */
    public void requireFreeForUser(String email, Long userId, Long providerId, Long adminOfOrgId) {
        String e = normalize(email);
        if (e == null) return;
        if (usedByUser(e, userId, providerId, null)) throw taken("another user");
        if (usedByProvider(e, providerId, userId)) throw taken("a provider");
        if (usedByOrganization(e, adminOfOrgId)) throw taken("an organization");
    }

    /** For a provider. providerId: the provider being saved (null = new). */
    public void requireFreeForProvider(String email, Long providerId) {
        String e = normalize(email);
        if (e == null) return;
        if (usedByProvider(e, providerId, null)) throw taken("another provider");
        if (usedByUser(e, null, providerId, null)) throw taken("a user");
        if (usedByOrganization(e, null)) throw taken("an organization");
    }

    /** For an organization. orgId: the organization being saved (null = new); its own admins may share it. */
    public void requireFreeForOrganization(String email, Long orgId) {
        String e = normalize(email);
        if (e == null) return;
        if (usedByOrganization(e, orgId)) throw taken("another organization");
        if (usedByUser(e, null, null, orgId)) throw taken("a user");
        if (usedByProvider(e, null, null)) throw taken("a provider");
    }

    /** True when the address belongs to anybody (used to generate unique test addresses). */
    public boolean inUse(String email) {
        String e = normalize(email);
        return e != null && (usedByUser(e, null, null, null) || usedByProvider(e, null, null) || usedByOrganization(e, null));
    }

    public static String normalize(String email) {
        return email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean usedByUser(String e, Long exceptUserId, Long exceptProviderId, Long exceptAdminsOfOrgId) {
        return userRepository.findAllByEmailOrUsernameIgnoreCase(e).stream()
                .filter(u -> !Objects.equals(u.getId(), exceptUserId))
                .filter(u -> exceptProviderId == null || !exceptProviderId.equals(u.getProviderId()))
                .anyMatch(u -> !isAdminOf(u, exceptAdminsOfOrgId));
    }

    private boolean usedByProvider(String e, Long exceptProviderId, Long exceptLoginOfUserId) {
        Long linkedProvider = exceptLoginOfUserId == null ? null
                : userRepository.findById(exceptLoginOfUserId).map(AppUser::getProviderId).orElse(null);
        return providerRepository.findAllByEmailIgnoreCase(e).stream()
                .map(Provider::getId)
                .anyMatch(id -> !id.equals(exceptProviderId) && !id.equals(linkedProvider));
    }

    private boolean usedByOrganization(String e, Long exceptOrgId) {
        return organizationRepository.findAllByEmailIgnoreCase(e).stream()
                .map(Organization::getId)
                .anyMatch(id -> !id.equals(exceptOrgId));
    }

    private static boolean isAdminOf(AppUser u, Long orgId) {
        return orgId != null && orgId.equals(u.getOrgId()) && Role.ORG_ADMIN.code().equals(u.getRole());
    }

    private static ConflictException taken(String who) {
        return ConflictException.onField("email", "This email is already used by " + who + ". Use a different email address.");
    }
}
