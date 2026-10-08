package com.zmartcredential.security;

import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.exception.UnauthorizedException;
import com.zmartcredential.repository.OrganizationRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;

/**
 * Request-scoped view of the current user and the effective tenant.
 * Inject it into services; every tenant query must be scoped by {@link #orgId()}.
 */
@Component
@RequiredArgsConstructor
public class AuthContext {

    public static final String ORG_HEADER = "X-Org-Id";

    private final OrganizationRepository organizationRepository;

    public AuthPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof PrincipalAuthentication pa) {
            return pa.getPrincipal();
        }
        throw new UnauthorizedException("Authentication required");
    }

    public Long userId() {
        return principal().userId();
    }

    public Role role() {
        return principal().role();
    }

    /**
     * Effective organization for tenant scoping. Platform admins act on the organization chosen
     * via the X-Org-Id header (first organization when absent); everybody else on their own org.
     */
    public Long orgId() {
        AuthPrincipal p = principal();
        if (!p.isPlatformAdmin()) {
            if (p.orgId() == null) throw new ForbiddenException("Your account is not linked to an organization");
            return p.orgId();
        }
        String header = currentRequestHeader(ORG_HEADER);
        if (header != null && !header.isBlank()) {
            long id;
            try {
                id = Long.parseLong(header.trim());
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid " + ORG_HEADER + " header");
            }
            if (!organizationRepository.existsById(id)) throw NotFoundException.of("Organization", id);
            return id;
        }
        return organizationRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new NotFoundException("No organizations exist yet")).getId();
    }

    /** Org of the user, or null for provider users not yet linked to an organization. */
    public Long orgIdOrNull() {
        AuthPrincipal p = principal();
        return p.isPlatformAdmin() ? orgId() : p.orgId();
    }

    public boolean hasRole(Role... roles) {
        Role current = role();
        return Arrays.asList(roles).contains(current);
    }

    public void requireRole(Role... roles) {
        if (!hasRole(roles)) throw new ForbiddenException("You do not have permission to perform this action");
    }

    /** Staff = everybody except provider users. */
    public void requireStaff() {
        if (principal().isProvider()) throw new ForbiddenException("This area is not available to provider accounts");
    }

    /** Provider users may only touch their own provider record. Staff pass. */
    public void requireProviderAccess(Long providerId) {
        AuthPrincipal p = principal();
        if (p.isProvider() && (p.providerId() == null || !p.providerId().equals(providerId))) {
            throw new ForbiddenException("You can only access your own provider record");
        }
    }

    /** The provider id of a provider user (403 for anybody else). */
    public Long requireOwnProviderId() {
        AuthPrincipal p = principal();
        if (!p.isProvider() || p.providerId() == null) throw new ForbiddenException("Provider account required");
        return p.providerId();
    }

    private static String currentRequestHeader(String name) {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest req = attrs.getRequest();
            return req.getHeader(name);
        }
        return null;
    }
}
