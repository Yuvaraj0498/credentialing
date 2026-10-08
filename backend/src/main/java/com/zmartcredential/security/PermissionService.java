package com.zmartcredential.security;

import com.zmartcredential.entity.RolePermission;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Role x entity x action permission matrix (prototype "Permissions" page).
 * Global defaults live in role_permission rows with org_id NULL; an organization may override them.
 * platform_admin is always allowed.
 */
@Service
@RequiredArgsConstructor
public class PermissionService {

    public static final List<String> ENTITIES = List.of("provider", "enrollment", "user", "location", "payer",
            "document", "task", "billing", "credential_vault", "payer_submission");
    public static final List<String> ACTIONS = List.of("create", "read", "update", "delete", "list");

    private final RolePermissionRepository repository;
    private final AuthContext authContext;
    private final com.zmartcredential.repository.AppUserRepository userRepository;

    private static final String ROLE_ATTR = "zc.permissionRole";

    public boolean can(String entity, String action) {
        AuthPrincipal p = authContext.principal();
        if (p.isPlatformAdmin()) return true;
        Long orgId = p.orgId();
        return matrix(orgId).getOrDefault(key(entity, action, currentPermissionRole(p)), false);
    }

    /** The permission column of a user: their User Role ("ur:<id>"), or the built-in role when none is set. */
    public static String permissionRole(String systemRole, Long userRoleId) {
        return userRoleId != null ? userRoleKey(userRoleId) : systemRole;
    }

    public static String userRoleKey(Long userRoleId) {
        return "ur:" + userRoleId;
    }

    /** Looked up once per request. */
    private String currentPermissionRole(AuthPrincipal p) {
        var attrs = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        Object cached = attrs == null ? null : attrs.getAttribute(ROLE_ATTR, org.springframework.web.context.request.RequestAttributes.SCOPE_REQUEST);
        if (cached instanceof String s) return s;
        Long userRoleId = userRepository.findById(p.userId()).map(com.zmartcredential.entity.AppUser::getUserRoleId).orElse(null);
        String role = permissionRole(p.role().code(), userRoleId);
        if (attrs != null) attrs.setAttribute(ROLE_ATTR, role, org.springframework.web.context.request.RequestAttributes.SCOPE_REQUEST);
        return role;
    }

    public void require(String entity, String action) {
        if (!can(entity, action)) {
            throw new ForbiddenException("Your role cannot " + action + " " + entity.replace('_', ' '));
        }
    }

    /** Effective matrix for an organization: global defaults overlaid with org overrides. */
    public Map<String, Boolean> matrix(Long orgId) {
        Map<String, Boolean> result = new HashMap<>();
        for (RolePermission rp : repository.findByOrgIdIsNull()) {
            result.put(key(rp.getEntity(), rp.getAction(), rp.getRole()), Boolean.TRUE.equals(rp.getAllowed()));
        }
        if (orgId != null) {
            for (RolePermission rp : repository.findByOrgId(orgId)) {
                result.put(key(rp.getEntity(), rp.getAction(), rp.getRole()), Boolean.TRUE.equals(rp.getAllowed()));
            }
        }
        return result;
    }

    public static String key(String entity, String action, String role) {
        return entity + ":" + action + ":" + role;
    }
}
