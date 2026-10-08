package com.zmartcredential.service;

import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Shared lookups and write guard for the operations module services. */
@Service
@RequiredArgsConstructor
public class OpsLookupService {

    private final ProviderRepository providerRepository;
    private final AppUserRepository appUserRepository;
    private final AuthContext authContext;

    public static String fullName(Provider p) {
        if (p == null) return null;
        String suffix = p.getSuffix() == null || p.getSuffix().isBlank() ? "" : ", " + p.getSuffix();
        return (p.getFirstName() + " " + p.getLastName()).trim() + suffix;
    }

    public static String plainName(Provider p) {
        return p == null ? null : (p.getFirstName() + " " + p.getLastName()).trim();
    }

    public Provider requireProvider(Long orgId, Long providerId) {
        if (providerId == null) throw new NotFoundException("Provider not found");
        return providerRepository.findByIdAndOrgId(providerId, orgId)
                .orElseThrow(() -> NotFoundException.of("Provider", providerId));
    }

    public Map<Long, Provider> providersById(Long orgId) {
        return providerRepository.findByOrgId(orgId).stream()
                .collect(Collectors.toMap(Provider::getId, Function.identity()));
    }

    public Map<Long, String> userNames(Collection<Long> ids) {
        Map<Long, String> out = new HashMap<>();
        var clean = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (clean.isEmpty()) return out;
        for (AppUser u : appUserRepository.findAllById(clean)) out.put(u.getId(), u.getDisplayName());
        return out;
    }

    /** Write guard for areas outside the permission matrix: platform_admin, org_admin, clerk. */
    public void requireWriter() {
        authContext.requireStaff();
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK);
    }
}
