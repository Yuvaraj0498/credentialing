package com.zmartcredential.service;

import com.zmartcredential.dto.organization.UserRoleDtos.UserRoleRequest;
import com.zmartcredential.dto.organization.UserRoleDtos.UserRoleResponse;
import com.zmartcredential.entity.UserRole;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.UserRoleRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Super admin → User Roles: a simple list of role names; org admins pick one in Users → Add user. */
@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRoleRepository repository;
    private final AppUserRepository userRepository;
    private final AuthContext authContext;
    private final com.zmartcredential.repository.RolePermissionRepository rolePermissionRepository;

    /** Every signed-in staff user can read the list (the Users form needs it). */
    @Transactional(readOnly = true)
    public List<UserRoleResponse> list() {
        return repository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public UserRoleResponse create(UserRoleRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        String name = clean(req.name());
        if (repository.existsByNameIgnoreCase(name)) throw new ConflictException("A role named \"" + name + "\" already exists");
        UserRole r = new UserRole();
        r.setName(name);
        r.setAccessLevel(req.accessLevel() == null || req.accessLevel().isBlank() ? "clerk" : req.accessLevel());
        return toResponse(repository.saveAndFlush(r));
    }

    @Transactional
    public UserRoleResponse update(Long id, UserRoleRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        UserRole r = load(id);
        String name = clean(req.name());
        if (repository.existsByNameIgnoreCaseAndIdNot(name, id)) throw new ConflictException("A role named \"" + name + "\" already exists");
        r.setName(name);
        // the built-in roles keep their access (admin / provider)
        if (r.getSystemKey() == null && req.accessLevel() != null && !req.accessLevel().isBlank() && !req.accessLevel().equals(r.getAccessLevel())) {
            r.setAccessLevel(req.accessLevel());
            // users with this role follow the new access level
            userRepository.findAll().stream().filter(u -> id.equals(u.getUserRoleId())).forEach(u -> {
                if (!"provider".equals(req.accessLevel()) || u.getProviderId() != null) u.setRole(req.accessLevel());
            });
        }
        return toResponse(repository.saveAndFlush(r));
    }

    /** The Administrator role (org admins) and the Provider role (provider logins) are used by Create Admin and
     *  the Providers module: they can be renamed but not deleted or disabled. */
    public boolean isBuiltIn(Long id) {
        return id != null && repository.findById(id).map(r -> r.getSystemKey() != null).orElse(false);
    }

    @Transactional
    public UserRoleResponse setActive(Long id, boolean active) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        UserRole r = load(id);
        if (!active && isBuiltIn(id)) {
            throw new com.zmartcredential.exception.BadRequestException("\"" + r.getName() + "\" is a built-in role and cannot be disabled");
        }
        r.setActive(active);
        return toResponse(repository.saveAndFlush(r));
    }

    @Transactional
    public void delete(Long id, Long moveTo) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        UserRole r = load(id);
        if (isBuiltIn(id)) {
            throw new com.zmartcredential.exception.BadRequestException("\"" + r.getName() + "\" is a built-in role and cannot be deleted");
        }
        long used = userRepository.countByUserRoleId(id);
        if (used > 0) {
            // the role's users move to another role first (their access follows that role)
            if (moveTo == null) {
                throw new ConflictException("\"" + r.getName() + "\" is assigned to " + used + " user(s). Choose the role to move them to.");
            }
            if (moveTo.equals(id)) throw new com.zmartcredential.exception.BadRequestException("Choose a different role");
            if (isBuiltIn(moveTo)) throw new com.zmartcredential.exception.BadRequestException("Users can only be moved to a staff role");
            UserRole target = load(moveTo);
            userRepository.findAll().stream().filter(u -> id.equals(u.getUserRoleId())).forEach(u -> {
                u.setUserRoleId(target.getId());
                String level = target.getAccessLevel();
                if (level != null && (!"provider".equals(level) || u.getProviderId() != null)) u.setRole(level);
                userRepository.save(u);
            });
        }
        rolePermissionRepository.deleteByRole(com.zmartcredential.security.PermissionService.userRoleKey(id));
        repository.delete(r);
    }

    private UserRole load(Long id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("User role", id));
    }

    /** Trims and collapses repeated spaces. */
    private static String clean(String name) {
        return name.trim().replaceAll("\\s+", " ");
    }

    private UserRoleResponse toResponse(UserRole r) {
        return new UserRoleResponse(r.getId(), r.getName(), r.getAccessLevel(), !Boolean.FALSE.equals(r.getActive()),
                userRepository.countByUserRoleId(r.getId()), r.getCreatedAt(), r.getUpdatedAt(), r.getSystemKey() != null);
    }
}
