package com.zmartcredential.service;

import com.zmartcredential.dto.organization.UserDtos.UserCreateRequest;
import com.zmartcredential.dto.organization.UserDtos.UserDirectoryEntry;
import com.zmartcredential.dto.organization.UserDtos.UserResponse;
import com.zmartcredential.dto.organization.UserDtos.UserUpdateRequest;
import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.zmartcredential.service.OrgLocationService.blankToNull;

/** Users of the current organization. Permission entity: user. */
@Service
@RequiredArgsConstructor
public class OrgUserService {

    private static final Set<String> ORG_ROLES = Set.of("org_admin", "clerk", "auditor", "provider");

    private final AppUserRepository userRepository;
    private final ProviderService providerService;
    private final EmailRegistry emailRegistry;
    private final ProviderRepository providerRepository;
    private final AuthContext authContext;
    private final PermissionService permissionService;
    private final PasswordEncoder passwordEncoder;
    private final com.zmartcredential.repository.UserRoleRepository userRoleRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> list(String q, String role) {
        authContext.requireStaff();
        permissionService.require("user", "list");
        Long orgId = authContext.orgId();
        List<AppUser> users = new ArrayList<>(userRepository.findByOrgIdOrderByDisplayNameAsc(orgId));
        if (authContext.hasRole(Role.PLATFORM_ADMIN)) {
            users.addAll(userRepository.findByRoleOrderByDisplayNameAsc(Role.PLATFORM_ADMIN.code()));
        }
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase(Locale.ROOT);
        String roleFilter = role == null || role.isBlank() || "all".equals(role) ? null
                : ("admin".equals(role) ? "org_admin" : role);
        List<AppUser> filtered = users.stream()
                .filter(u -> roleFilter == null || roleFilter.equals(normalizeRole(u.getRole())))
                .filter(u -> needle == null || contains(u.getDisplayName(), needle) || contains(u.getEmail(), needle)
                        || contains(u.getUsername(), needle))
                .sorted(Comparator.comparing(u -> u.getDisplayName() == null ? "" : u.getDisplayName().toLowerCase(Locale.ROOT)))
                .toList();
        return toResponses(filtered);
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        authContext.requireStaff();
        permissionService.require("user", "read");
        return toResponses(List.of(load(id))).getFirst();
    }

    @Transactional(readOnly = true)
    public List<UserDirectoryEntry> directory(boolean includeProviders) {
        authContext.requireStaff();
        return userRepository.findByOrgIdOrderByDisplayNameAsc(authContext.orgId()).stream()
                .filter(u -> !Boolean.TRUE.equals(u.getDisabled()))
                .filter(u -> includeProviders || !Role.PROVIDER.code().equals(u.getRole()))
                .map(u -> new UserDirectoryEntry(u.getId(), u.getDisplayName(), normalizeRole(u.getRole()), u.getTitle()))
                .toList();
    }

    @Transactional
    public UserResponse create(UserCreateRequest req) {
        authContext.requireStaff();
        permissionService.require("user", "create");
        Long orgId = authContext.orgId();
        String role = validateRole(accessLevelOf(req.userRoleId()));
        String username = req.username().trim().toLowerCase(Locale.ROOT);
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsername(username) || userRepository.existsByEmail(username)) {
            throw ConflictException.onField("username", "Username is already taken");
        }
        if (userRepository.existsByEmail(email) || userRepository.existsByUsername(email)) {
            throw ConflictException.onField("email", "Email is already used by another account");
        }
        emailRegistry.requireFreeForUser(email, null, "provider".equals(role) ? req.providerId() : null,
                Role.ORG_ADMIN.code().equals(role) ? orgId : null);
        if (!username.equals(email)) emailRegistry.requireFreeForUser(username, null, "provider".equals(role) ? req.providerId() : null,
                Role.ORG_ADMIN.code().equals(role) ? orgId : null);
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setEmail(email);
        apply(u, orgId, role, req.displayName(), req.firstName(), req.lastName(), req.title(), req.phone(),
                req.providerId());
        u.setUserRoleId(requireUserRole(req.userRoleId()));
        u.setDisabled(Boolean.TRUE.equals(req.disabled()));
        return toResponses(List.of(userRepository.save(u))).getFirst();
    }

    /**
     * Adds a provider together with their sign-in (Providers → Add Provider, Organization → Add Provider,
     * Users → Add User with the Provider role). Every Add Provider Manually rule applies; nothing is saved if
     * the provider or the login fails.
     */
    @Transactional
    public UserResponse createWithProvider(com.zmartcredential.dto.organization.UserDtos.UserWithProviderRequest req) {
        authContext.requireStaff();
        permissionService.require("provider", "create");
        if (req.userRoleId() != null && !"provider".equals(accessLevelOf(req.userRoleId()))) {
            throw new BadRequestException("Choose a provider role");
        }
        checkLogin(req.username(), req.password());
        var provider = providerService.create(req.provider());
        return createProviderLogin(provider.id(), req.username(), req.password(), req.userRoleId());
    }

    /** Username / password rules for a new sign-in (checked before anything is saved). */
    public void checkLogin(String rawUsername, String password) {
        String username = rawUsername == null ? "" : rawUsername.trim().toLowerCase(Locale.ROOT);
        if (username.isEmpty()) throw BadRequestException.onField("username", "Username is required");
        if (!username.matches("[a-z0-9._@+-]{3,150}")) {
            throw BadRequestException.onField("username", "3-150 characters: letters, digits and . _ - @ + only");
        }
        if (userRepository.existsByUsername(username) || userRepository.existsByEmail(username)) {
            throw ConflictException.onField("username", "Username is already taken");
        }
        if (password == null || password.length() < 8) throw BadRequestException.onField("password", "At least 8 characters");
        if (password.length() > 100) throw BadRequestException.onField("password", "At most 100 characters");
    }

    /** The sign-in of a provider that was just added (the caller checked the permissions). */
    @Transactional
    public UserResponse createProviderLogin(Long providerId, String rawUsername, String password, Long userRoleId) {
        checkLogin(rawUsername, password);
        Provider p = providerRepository.findById(providerId).orElseThrow(() -> NotFoundException.of("Provider", providerId));
        String email = p.getEmail() == null ? null : p.getEmail().trim().toLowerCase(Locale.ROOT);
        if (email == null) throw BadRequestException.onField("email", "Email is required");
        if (userRepository.existsByEmail(email)) throw ConflictException.onField("email", "Email is already used by another account");
        emailRegistry.requireFreeForUser(email, null, providerId, null);
        AppUser u = new AppUser();
        u.setUsername(rawUsername.trim().toLowerCase(Locale.ROOT));
        u.setPasswordHash(passwordEncoder.encode(password));
        u.setEmail(email);
        String name = ((p.getFirstName() == null ? "" : p.getFirstName()) + " " + (p.getLastName() == null ? "" : p.getLastName())).trim();
        apply(u, p.getOrgId(), Role.PROVIDER.code(), name, p.getFirstName(), p.getLastName(), p.getSuffix(), p.getPhone(), providerId);
        u.setUserRoleId(userRoleId != null ? requireUserRole(userRoleId) : userRoleRepository.defaultFor(Role.PROVIDER.code()));
        u.setDisabled(false);
        return toResponses(List.of(userRepository.save(u))).getFirst();
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest req) {
        authContext.requireStaff();
        permissionService.require("user", "update");
        Long orgId = authContext.orgId();
        AppUser u = load(id);
        String role = validateRole(accessLevelOf(req.userRoleId()));
        boolean self = u.getId().equals(authContext.userId());
        if (self && !role.equals(normalizeRole(u.getRole()))) {
            throw new BadRequestException("You cannot change your own role");
        }
        if (self && Boolean.TRUE.equals(req.disabled())) {
            throw new BadRequestException("You cannot disable your own account");
        }
        if (Role.ORG_ADMIN.code().equals(normalizeRole(u.getRole()))
                && (!Role.ORG_ADMIN.code().equals(role) || Boolean.TRUE.equals(req.disabled()))) {
            ensureAnotherOrgAdmin(u);
        }
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (!email.equalsIgnoreCase(Objects.toString(u.getEmail(), ""))) {
            if (userRepository.existsByEmailAndIdNot(email, u.getId())
                    || userRepository.findByUsername(email).filter(o -> !o.getId().equals(u.getId())).isPresent()) {
                throw ConflictException.onField("email", "Email is already used by another account");
            }
            emailRegistry.requireFreeForUser(email, u.getId(), "provider".equals(role) ? req.providerId() : null,
                    Role.ORG_ADMIN.code().equals(role) ? u.getOrgId() : null);
            u.setEmail(email);
        }
        if (req.password() != null && !req.password().isBlank()) {
            if (req.password().length() < 8) throw new BadRequestException("Password must be at least 8 characters");
            u.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        apply(u, orgId, role, req.displayName(), req.firstName(), req.lastName(), req.title(), req.phone(),
                req.providerId());
        u.setUserRoleId(requireUserRole(req.userRoleId()));
        if (req.disabled() != null) u.setDisabled(req.disabled());
        return toResponses(List.of(userRepository.save(u))).getFirst();
    }

    @Transactional
    public UserResponse setDisabled(Long id, boolean disabled) {
        authContext.requireStaff();
        permissionService.require("user", "update");
        AppUser u = load(id);
        if (u.getId().equals(authContext.userId())) throw new BadRequestException("You cannot disable your own account");
        if (disabled && Role.ORG_ADMIN.code().equals(normalizeRole(u.getRole()))) ensureAnotherOrgAdmin(u);
        u.setDisabled(disabled);
        return toResponses(List.of(userRepository.save(u))).getFirst();
    }

    @Transactional
    public void delete(Long id) {
        authContext.requireStaff();
        permissionService.require("user", "delete");
        AppUser u = load(id);
        if (u.getId().equals(authContext.userId())) throw new ConflictException("You cannot delete your own account");
        if (Role.ORG_ADMIN.code().equals(normalizeRole(u.getRole()))) ensureAnotherOrgAdmin(u);
        userRepository.delete(u);
    }

    // ---------- helpers ----------

    /** Loads a user of the current org; platform admins can also reach other platform-admin accounts. */
    private AppUser load(Long id) {
        Long orgId = authContext.orgId();
        return userRepository.findByIdAndOrgId(id, orgId)
                .or(() -> authContext.hasRole(Role.PLATFORM_ADMIN)
                        ? userRepository.findById(id).filter(u -> Role.PLATFORM_ADMIN.code().equals(u.getRole()))
                        : java.util.Optional.empty())
                .orElseThrow(() -> NotFoundException.of("User", id));
    }

    private String validateRole(String raw) {
        String role = normalizeRole(raw == null ? "" : raw.trim());
        boolean callerPa = authContext.hasRole(Role.PLATFORM_ADMIN);
        if (Role.PLATFORM_ADMIN.code().equals(role)) {
            if (!callerPa) throw new ForbiddenException("Only platform admins can assign the Platform Admin role");
            return role;
        }
        if (!ORG_ROLES.contains(role)) throw new BadRequestException("Invalid role: " + raw);
        if (Role.ORG_ADMIN.code().equals(role) && !authContext.hasRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN)) {
            throw new ForbiddenException("Only administrators can assign the Org Admin role");
        }
        return role;
    }

    private void apply(AppUser u, Long orgId, String role, String displayName, String firstName, String lastName,
                       String title, String phone, Long providerId) {
        u.setRole(role);
        u.setDisplayName(displayName.trim());
        u.setFirstName(blankToNull(firstName));
        u.setLastName(blankToNull(lastName));
        u.setTitle(blankToNull(title));
        u.setPhone(blankToNull(phone));
        if (Role.PLATFORM_ADMIN.code().equals(role)) {
            u.setOrgId(null);
            u.setProviderId(null);
            return;
        }
        u.setOrgId(orgId);
        if (Role.PROVIDER.code().equals(role)) {
            if (providerId == null) throw new BadRequestException("Select the provider this account belongs to");
            Provider p = providerRepository.findByIdAndOrgId(providerId, orgId)
                    .orElseThrow(() -> new BadRequestException("Selected provider does not exist in this organization"));
            userRepository.findByProviderId(p.getId())
                    .filter(other -> !other.getId().equals(u.getId()))
                    .ifPresent(other -> {
                        throw new ConflictException("Provider already has a login: " + other.getUsername());
                    });
            u.setProviderId(p.getId());
        } else {
            u.setProviderId(null);
        }
    }

    private void ensureAnotherOrgAdmin(AppUser target) {
        if (target.getOrgId() == null) return;
        boolean another = userRepository.findByOrgId(target.getOrgId()).stream()
                .anyMatch(o -> !o.getId().equals(target.getId())
                        && Role.ORG_ADMIN.code().equals(normalizeRole(o.getRole()))
                        && !Boolean.TRUE.equals(o.getDisabled()));
        if (!another) throw new ConflictException("The organization must keep at least one active Org Admin");
    }

    /** The access level (system role) of a User Roles entry. */
    private String accessLevelOf(Long userRoleId) {
        if (userRoleId == null) throw new BadRequestException("Choose a role from the list");
        return userRoleRepository.findById(userRoleId)
                .map(com.zmartcredential.entity.UserRole::getAccessLevel)
                .orElseThrow(() -> new BadRequestException("Choose a role from the list"));
    }

    private Long requireUserRole(Long id) {
        if (id == null || !userRoleRepository.existsById(id)) throw new BadRequestException("Choose a role from the list");
        return id;
    }

    private List<UserResponse> toResponses(List<AppUser> users) {
        Map<Long, String> roleNames = userRoleRepository.findAll().stream()
                .collect(Collectors.toMap(com.zmartcredential.entity.UserRole::getId, com.zmartcredential.entity.UserRole::getName));
        List<Long> providerIds = users.stream().map(AppUser::getProviderId).filter(Objects::nonNull).distinct().toList();
        Map<Long, Provider> providers = providerIds.isEmpty() ? Map.of()
                : providerRepository.findAllById(providerIds).stream()
                .collect(Collectors.toMap(Provider::getId, Function.identity()));
        return users.stream().map(u -> {
            Provider p = u.getProviderId() == null ? null : providers.get(u.getProviderId());
            String providerName = p == null ? null
                    : (p.getFirstName() + " " + p.getLastName() + (p.getSuffix() == null ? "" : ", " + p.getSuffix()));
            return new UserResponse(u.getId(), u.getOrgId(), u.getUsername(), u.getEmail(), u.getFirstName(),
                    u.getLastName(), u.getDisplayName(), u.getTitle(), u.getPhone(), normalizeRole(u.getRole()),
                    u.getProviderId(), providerName, Boolean.TRUE.equals(u.getDisabled()),
                    Boolean.TRUE.equals(u.getSelfSignup()), Boolean.TRUE.equals(u.getTestData()), u.getLastLoginAt(),
                    u.getCreatedAt(), u.getUserRoleId(), u.getUserRoleId() == null ? null : roleNames.get(u.getUserRoleId()));
        }).toList();
    }

    static String normalizeRole(String role) {
        return "admin".equals(role) ? Role.ORG_ADMIN.code() : role;
    }

    private static boolean contains(String v, String needle) {
        return v != null && v.toLowerCase(Locale.ROOT).contains(needle);
    }
}
