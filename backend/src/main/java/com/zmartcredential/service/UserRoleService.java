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
        return toResponse(repository.saveAndFlush(r));
    }

    @Transactional
    public UserRoleResponse update(Long id, UserRoleRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        UserRole r = load(id);
        String name = clean(req.name());
        if (repository.existsByNameIgnoreCaseAndIdNot(name, id)) throw new ConflictException("A role named \"" + name + "\" already exists");
        r.setName(name);
        return toResponse(repository.saveAndFlush(r));
    }

    @Transactional
    public void delete(Long id) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        UserRole r = load(id);
        long used = userRepository.countByUserRoleId(id);
        if (used > 0) {
            throw new ConflictException("\"" + r.getName() + "\" is assigned to " + used + " user(s). Change their role first.");
        }
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
        return new UserRoleResponse(r.getId(), r.getName(), userRepository.countByUserRoleId(r.getId()), r.getCreatedAt(), r.getUpdatedAt());
    }
}
