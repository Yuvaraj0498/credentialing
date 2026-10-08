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

    public boolean can(String entity, String action) {
        AuthPrincipal p = authContext.principal();
        if (p.isPlatformAdmin()) return true;
        Long orgId = p.orgId();
        return matrix(orgId).getOrDefault(key(entity, action, p.role().code()), false);
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
