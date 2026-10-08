package com.zmartcredential.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

/** Authentication whose principal is an {@link AuthPrincipal} built from verified JWT claims. */
public class PrincipalAuthentication extends AbstractAuthenticationToken {

    private final AuthPrincipal principal;
    private final Jwt jwt;

    public PrincipalAuthentication(AuthPrincipal principal, Jwt jwt) {
        super(List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name())));
        this.principal = principal;
        this.jwt = jwt;
        setAuthenticated(true);
    }

    public static PrincipalAuthentication fromJwt(Jwt jwt) {
        Long org = jwt.getClaim("org") != null ? ((Number) jwt.getClaim("org")).longValue() : null;
        Long pid = jwt.getClaim("pid") != null ? ((Number) jwt.getClaim("pid")).longValue() : null;
        AuthPrincipal p = new AuthPrincipal(
                Long.valueOf(jwt.getSubject()), org, Role.fromCode(jwt.getClaimAsString("role")), pid,
                jwt.getClaimAsString("uname"), jwt.getClaimAsString("name"));
        return new PrincipalAuthentication(p, jwt);
    }

    @Override
    public Object getCredentials() {
        return jwt;
    }

    @Override
    public AuthPrincipal getPrincipal() {
        return principal;
    }
}
