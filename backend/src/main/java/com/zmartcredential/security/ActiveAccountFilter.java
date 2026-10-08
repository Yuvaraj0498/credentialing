package com.zmartcredential.security;

import com.zmartcredential.entity.AppUser;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.OrganizationRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Objects;

/**
 * Access tokens carry the user's role / org / provider as claims. This filter re-checks them against the
 * database on every request, so disabling, deleting or re-assigning a user, or suspending their organization,
 * takes effect immediately instead of when the 30-minute token expires. A stale token gets 401; the admin app
 * then refreshes it (which re-applies the login rules) or signs the user out.
 * Registered in SecurityConfig after the bearer-token filter (not a bean, so it is not added to the servlet chain twice).
 */
public class ActiveAccountFilter extends OncePerRequestFilter {

    public interface ErrorWriter {
        void write(HttpServletRequest req, HttpServletResponse res, String message) throws IOException;
    }

    private final AppUserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final com.zmartcredential.repository.UserRoleRepository userRoleRepository;
    private final ErrorWriter errorWriter;

    public ActiveAccountFilter(AppUserRepository userRepository, OrganizationRepository organizationRepository,
                               com.zmartcredential.repository.UserRoleRepository userRoleRepository, ErrorWriter errorWriter) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.userRoleRepository = userRoleRepository;
        this.errorWriter = errorWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof PrincipalAuthentication pa) {
            String problem = check(pa.getPrincipal());
            if (problem != null) {
                SecurityContextHolder.clearContext();
                errorWriter.write(req, res, problem);
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private String check(AuthPrincipal p) {
        AppUser u = userRepository.findById(p.userId()).orElse(null);
        if (u == null) return "Your account no longer exists. Please sign in again.";
        if (Boolean.TRUE.equals(u.getDisabled())) return "Your account has been disabled.";
        if (userRoleRepository.isDisabled(u.getUserRoleId())) return "Your role has been disabled. Contact your administrator.";
        if (!Role.isValid(u.getRole()) && !"admin".equals(u.getRole())) return "Your session is no longer valid. Please sign in again.";
        if (Role.fromCode(u.getRole()) != p.role() || !Objects.equals(u.getOrgId(), p.orgId())
                || !Objects.equals(u.getProviderId(), p.providerId())) {
            return "Your account was changed. Please sign in again.";
        }
        if (u.getOrgId() != null && organizationRepository.findById(u.getOrgId())
                .map(o -> "suspended".equals(o.getStatus())).orElse(true)) {
            return "Your organization's account is suspended. Contact ZmartCredential support.";
        }
        return null;
    }
}
