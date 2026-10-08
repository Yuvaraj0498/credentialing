package com.zmartcredential.service;

import com.zmartcredential.dto.organization.PermissionDtos.PermissionMatrixRequest;
import com.zmartcredential.dto.organization.PermissionDtos.PermissionMatrixResponse;
import com.zmartcredential.dto.organization.PermissionDtos.RoleInfo;
import com.zmartcredential.entity.AuditLog;
import com.zmartcredential.entity.RolePermission;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.repository.AuditLogRepository;
import com.zmartcredential.repository.RolePermissionRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Permissions page. Global defaults = role_permission rows with org_id NULL; an organization stores only the
 * cells that differ from the defaults (org_id = tenant). platform_admin is always allowed and never stored per org.
 */
@Service
@RequiredArgsConstructor
public class OrgPermissionMatrixService {

    private static final String[] COLORS = {"#f97316", "#2563eb", "#059669", "#6b7280", "#7c3aed", "#0891b2", "#db2777", "#ca8a04"};
    private static final RoleInfo SUPER_ADMIN = new RoleInfo("platform_admin", "Super Admin", "#dc2626", "Full access — always allowed");


    private final RolePermissionRepository repository;
    private final com.zmartcredential.repository.UserRoleRepository userRoleRepository;
    private final PermissionService permissionService;
    private final AuditLogRepository auditLogRepository;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public PermissionMatrixResponse get() {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        return build(orgId);
    }

    @Transactional
    public PermissionMatrixResponse saveOrgOverrides(PermissionMatrixRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        Long orgId = authContext.orgId();
        validate(req.matrix());
        Map<String, Boolean> effective = permissionService.matrix(orgId);
        Map<String, Boolean> defaults = permissionService.matrix(null);

        java.util.Set<String> visible = new java.util.HashSet<>(roles().stream().map(RoleInfo::id).toList());
        repository.deleteOrgOverrides(orgId);
        List<RolePermission> rows = new ArrayList<>();
        for (String entity : PermissionService.ENTITIES) {
            for (String action : PermissionService.ACTIONS) {
                List<String> requested = cell(req.matrix(), entity, action);
                for (String role : tenantRoles()) {
                    String key = PermissionService.key(entity, action, role);
                    // disabled roles are not on the page: keep what they had
                    boolean desired = requested != null && visible.contains(role) ? requested.contains(role) : effective.getOrDefault(key, false);
                    if (desired != defaults.getOrDefault(key, false)) {
                        rows.add(row(orgId, entity, action, role, desired));
                    }
                }
            }
        }
        repository.saveAll(rows);
        audit(orgId, "update", "Permission matrix saved (" + rows.size() + " override(s))");
        return build(orgId);
    }

    @Transactional
    public PermissionMatrixResponse resetOrgOverrides() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        Long orgId = authContext.orgId();
        int removed = repository.deleteOrgOverrides(orgId);
        audit(orgId, "reset", "Permission matrix reset to defaults (" + removed + " override(s) removed)");
        return build(orgId);
    }

    @Transactional
    public PermissionMatrixResponse saveDefaults(PermissionMatrixRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        validate(req.matrix());
        List<RoleInfo> roleList = roles();
        Map<String, RolePermission> existing = new HashMap<>();
        for (RolePermission rp : repository.findByOrgIdIsNull()) {
            existing.put(PermissionService.key(rp.getEntity(), rp.getAction(), rp.getRole()), rp);
        }
        List<RolePermission> toSave = new ArrayList<>();
        for (String entity : PermissionService.ENTITIES) {
            for (String action : PermissionService.ACTIONS) {
                List<String> requested = cell(req.matrix(), entity, action);
                for (RoleInfo r : roleList) {
                    String key = PermissionService.key(entity, action, r.id());
                    RolePermission rp = existing.get(key);
                    boolean desired;
                    if (Role.PLATFORM_ADMIN.code().equals(r.id())) desired = true;
                    else if (requested != null) desired = requested.contains(r.id());
                    else desired = rp != null && Boolean.TRUE.equals(rp.getAllowed());
                    if (rp == null) {
                        toSave.add(row(null, entity, action, r.id(), desired));
                    } else if (!Boolean.valueOf(desired).equals(rp.getAllowed())) {
                        rp.setAllowed(desired);
                        toSave.add(rp);
                    }
                }
            }
        }
        repository.saveAll(toSave);
        audit(null, "update", "Global default permissions updated (" + toSave.size() + " cell(s))");
        return build(authContext.orgId());
    }

    // ---------- helpers ----------

    /** Matrix columns: Super Admin first, then every role the super admin created (User Roles). */
    private List<RoleInfo> roles() {
        return roles(false);
    }

    /** includeDisabled: also the roles the super admin disabled (hidden on the page, their settings are kept). */
    private List<RoleInfo> roles(boolean includeDisabled) {
        List<RoleInfo> out = new ArrayList<>();
        out.add(SUPER_ADMIN);
        int i = 0;
        for (var r : userRoleRepository.findAllByOrderByNameAsc()) {
            if (!includeDisabled && Boolean.FALSE.equals(r.getActive())) continue;
            out.add(new RoleInfo(PermissionService.userRoleKey(r.getId()), r.getName(), COLORS[i++ % COLORS.length], ""));
        }
        return out;
    }

    private List<String> tenantRoles() {
        return roles(true).stream().map(RoleInfo::id).filter(id -> !Role.PLATFORM_ADMIN.code().equals(id)).toList();
    }

    private PermissionMatrixResponse build(Long orgId) {
        boolean pa = authContext.hasRole(Role.PLATFORM_ADMIN);
        List<RoleInfo> roleList = roles();
        return new PermissionMatrixResponse(roleList, PermissionService.ENTITIES, PermissionService.ACTIONS,
                shape(permissionService.matrix(orgId), roleList), shape(permissionService.matrix(null), roleList),
                !repository.findByOrgId(orgId).isEmpty(), pa || authContext.hasRole(Role.ORG_ADMIN), pa);
    }

    private static Map<String, Map<String, List<String>>> shape(Map<String, Boolean> flat, List<RoleInfo> roleList) {
        Map<String, Map<String, List<String>>> out = new LinkedHashMap<>();
        for (String entity : PermissionService.ENTITIES) {
            Map<String, List<String>> actions = new LinkedHashMap<>();
            for (String action : PermissionService.ACTIONS) {
                List<String> roles = new ArrayList<>();
                for (RoleInfo r : roleList) {
                    if (Role.PLATFORM_ADMIN.code().equals(r.id())
                            || flat.getOrDefault(PermissionService.key(entity, action, r.id()), false)) {
                        roles.add(r.id());
                    }
                }
                actions.put(action, roles);
            }
            out.put(entity, actions);
        }
        return out;
    }

    private static List<String> cell(Map<String, Map<String, List<String>>> m, String entity, String action) {
        Map<String, List<String>> actions = m.get(entity);
        return actions == null ? null : actions.get(action);
    }

    private void validate(Map<String, Map<String, List<String>>> matrix) {
        java.util.Set<String> known = new java.util.HashSet<>(roles().stream().map(RoleInfo::id).toList());
        for (Map.Entry<String, Map<String, List<String>>> e : matrix.entrySet()) {
            if (!PermissionService.ENTITIES.contains(e.getKey())) throw new BadRequestException("Unknown entity: " + e.getKey());
            if (e.getValue() == null) continue;
            for (Map.Entry<String, List<String>> a : e.getValue().entrySet()) {
                if (!PermissionService.ACTIONS.contains(a.getKey())) throw new BadRequestException("Unknown action: " + a.getKey());
                if (a.getValue() == null) throw new BadRequestException("Roles list missing for " + e.getKey() + "." + a.getKey());
                for (String role : a.getValue()) {
                    if (!known.contains(role)) throw new BadRequestException("Unknown role: " + role);
                }
            }
        }
    }

    private static RolePermission row(Long orgId, String entity, String action, String role, boolean allowed) {
        RolePermission rp = new RolePermission();
        rp.setOrgId(orgId);
        rp.setEntity(entity);
        rp.setAction(action);
        rp.setRole(role);
        rp.setAllowed(allowed);
        return rp;
    }

    private void audit(Long orgId, String action, String summary) {
        AuditLog log = new AuditLog();
        log.setOrgId(orgId);
        log.setUserId(authContext.userId());
        log.setEntity("permission");
        log.setAction(action);
        log.setSummary(summary);
        log.setCreatedAt(LocalDateTime.now());
        auditLogRepository.save(log);
    }
}
