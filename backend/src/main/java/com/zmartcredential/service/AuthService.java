package com.zmartcredential.service;

import com.zmartcredential.config.AppProperties;
import com.zmartcredential.dto.auth.AuthResponse;
import com.zmartcredential.dto.auth.LoginRequest;
import com.zmartcredential.dto.auth.MeResponse;
import com.zmartcredential.dto.auth.OrgSignupRequest;
import com.zmartcredential.dto.auth.ProviderSignupRequest;
import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.ChatChannel;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.PaymentMethod;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.RefreshToken;
import com.zmartcredential.entity.Subscription;
import com.zmartcredential.entity.SubscriptionPackage;
import com.zmartcredential.entity.UsageCounter;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.exception.UnauthorizedException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.ChatChannelRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.PaymentMethodRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.repository.RefreshTokenRepository;
import com.zmartcredential.repository.SubscriptionPackageRepository;
import com.zmartcredential.repository.SubscriptionRepository;
import com.zmartcredential.repository.UsageCounterRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.JwtService;
import com.zmartcredential.security.PermissionService;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository userRepository;
    private final com.zmartcredential.repository.UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final ProviderRepository providerRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SubscriptionPackageRepository packageRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final UsageCounterRepository usageCounterRepository;
    private final ChatChannelRepository chatChannelRepository;
    private final ProviderDocumentInitializer documentInitializer;
    private final NotificationService notificationService;
    private final PermissionService permissionService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CryptoService cryptoService;
    private final AuthContext authContext;
    private final AppProperties props;

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String login = req.username().trim();
        AppUser user = userRepository.findByUsernameOrEmail(login, login)
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid username or password");
        }
        if (Boolean.TRUE.equals(user.getDisabled())) {
            throw new ForbiddenException("This account has been disabled. Contact your administrator.");
        }
        if (user.getOrgId() != null && organizationRepository.findById(user.getOrgId())
                .map(o -> "suspended".equals(o.getStatus())).orElse(false)) {
            throw new ForbiddenException("Your organization's account is suspended. Contact ZmartCredential support.");
        }
        user.setLastLoginAt(LocalDateTime.now());
        return issueTokens(user);
    }

    /** Rotates the refresh token: the presented token is revoked and a new pair is issued. */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(CryptoService.sha256Hex(rawRefreshToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token expired. Please sign in again.");
        }
        token.setRevokedAt(LocalDateTime.now());
        AppUser user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new UnauthorizedException("Account no longer exists"));
        if (Boolean.TRUE.equals(user.getDisabled())) throw new ForbiddenException("This account has been disabled.");
        if (user.getOrgId() != null && organizationRepository.findById(user.getOrgId())
                .map(o -> "suspended".equals(o.getStatus())).orElse(false)) {
            throw new ForbiddenException("Your organization's account is suspended. Contact ZmartCredential support.");
        }
        return issueTokens(user);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        refreshTokenRepository.findByTokenHash(CryptoService.sha256Hex(rawRefreshToken))
                .ifPresent(t -> t.setRevokedAt(LocalDateTime.now()));
    }

    @Transactional(readOnly = true)
    public MeResponse me() {
        AppUser user = userRepository.findById(authContext.userId())
                .orElseThrow(() -> new UnauthorizedException("Account no longer exists"));
        return toMe(user);
    }

    @Transactional
    public AuthResponse signupOrganization(OrgSignupRequest req) {
        return issueTokens(createOrganizationWithAdmin(req, true));
    }

    /**
     * Organization sign-up workflow: organization, admin user (all modules), subscription, payment method.
     * Used by the super admin's "Create Admin" (selfSignup = false).
     */
    @Transactional
    public AppUser createOrganizationWithAdmin(OrgSignupRequest req, boolean selfSignup) {
        String exp = req.paymentMethod().exp();
        java.time.YearMonth cardMonth = java.time.YearMonth.of(2000 + Integer.parseInt(exp.substring(3)), Integer.parseInt(exp.substring(0, 2)));
        if (cardMonth.isBefore(java.time.YearMonth.now())) throw new BadRequestException("The card has expired — enter a current expiration date");
        String email = req.admin().email().trim().toLowerCase();
        if (userRepository.existsByEmail(email) || userRepository.existsByUsername(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        SubscriptionPackage pkg = packageRepository.findById(req.plan().packageId())
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .orElseThrow(() -> new BadRequestException("Unknown plan"));
        if (pkg.getProviderCap() != null && req.plan().estimatedProviders() > pkg.getProviderCap()) {
            throw new BadRequestException("The " + pkg.getName() + " plan supports up to " + pkg.getProviderCap()
                    + " providers. Choose a larger plan.");
        }

        Organization org = new Organization();
        org.setName(req.org().name().trim());
        org.setOrgType(req.org().type());
        org.setTaxId(req.org().taxId());
        org.setWebsite(req.org().website());
        org.setAddress(req.org().address());
        org.setCity(req.org().city());
        org.setState(req.org().state());
        org.setZip(req.org().zip());
        org.setEmail(email);
        org.setPhone(req.admin().phone());
        org.setSelfSignup(selfSignup);
        org.setInviteCode(generateInviteCode());
        org = organizationRepository.save(org);

        AppUser user = new AppUser();
        user.setOrgId(org.getId());
        user.setUsername(email);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.admin().password()));
        user.setFirstName(req.admin().firstName().trim());
        user.setLastName(req.admin().lastName().trim());
        user.setDisplayName(user.getFirstName() + " " + user.getLastName());
        user.setPhone(req.admin().phone());
        user.setTitle("Admin");
        user.setRole(Role.ORG_ADMIN.code());
        user.setUserRoleId(userRoleRepository.findAllByOrderByNameAsc().stream()
                .filter(r -> Role.ORG_ADMIN.code().equals(r.getAccessLevel())).map(com.zmartcredential.entity.UserRole::getId)
                .findFirst().orElse(null));
        user.setSelfSignup(selfSignup);
        user = userRepository.save(user);

        Subscription sub = new Subscription();
        sub.setOrgId(org.getId());
        sub.setPackageCode(pkg.getCode());
        sub.setProviderCount(req.plan().estimatedProviders());
        sub.setStatus("active");
        sub.setStartedAt(LocalDateTime.now());
        sub.setNextRenewalDate(LocalDate.now().plusDays(30));
        subscriptionRepository.save(sub);

        PaymentMethod pm = new PaymentMethod();
        pm.setOrgId(org.getId());
        pm.setBrand(req.paymentMethod().brand());
        pm.setLast4(req.paymentMethod().last4());
        pm.setExp(req.paymentMethod().exp());
        pm.setBillingName(req.paymentMethod().billingName());
        pm.setBillingZip(req.paymentMethod().billingZip());
        pm.setDefaultMethod(true);
        paymentMethodRepository.save(pm);

        UsageCounter usage = new UsageCounter();
        usage.setOrgId(org.getId());
        usage.setPeriod(YearMonth.now().toString());
        usage.setAiUploads(0);
        usageCounterRepository.save(usage);

        createDefaultChannels(org.getId(), user.getId());

        notificationService.notifyUser(org.getId(), user.getId(), "Welcome to ZmartCredential!",
                "Your organization account is active. Subscription: " + pkg.getName(), "PartyPopper",
                NotificationService.ACCENT);
        return user;
    }

    @Transactional
    public AuthResponse signupProvider(ProviderSignupRequest req) {
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email) || userRepository.existsByUsername(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        Long orgId = null;
        if (req.organizationCode() != null && !req.organizationCode().isBlank()) {
            orgId = organizationRepository.findByInviteCode(req.organizationCode().trim().toUpperCase())
                    .filter(o -> "active".equals(o.getStatus()))
                    .orElseThrow(() -> new BadRequestException("Invalid organization code")).getId();
            if (providerRepository.existsByOrgIdAndNpi(orgId, req.npi())) {
                throw new ConflictException("A provider with this NPI already exists in that organization");
            }
        }

        Provider provider = new Provider();
        provider.setOrgId(orgId);
        provider.setFirstName(req.firstName().trim());
        provider.setLastName(req.lastName().trim());
        provider.setSuffix(req.suffix());
        provider.setNpi(req.npi());
        provider.setSpecialty(req.specialty());
        provider.setEmail(email);
        provider.setPhone(req.phone());
        provider.setLicenseState(req.licenseState());
        provider.setStatus("draft");
        provider.setSource("self_signup");
        provider.setDateAdded(LocalDate.now());
        provider.setSelfSignup(true);
        provider = providerRepository.save(provider);
        documentInitializer.initialize(provider);

        AppUser user = new AppUser();
        user.setOrgId(orgId);
        user.setUsername(email);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setFirstName(provider.getFirstName());
        user.setLastName(provider.getLastName());
        user.setDisplayName(provider.getFirstName() + " " + provider.getLastName());
        user.setPhone(req.phone());
        user.setTitle(req.suffix());
        user.setRole(Role.PROVIDER.code());
        user.setProviderId(provider.getId());
        user.setSelfSignup(true);
        user = userRepository.save(user);

        if (orgId != null) {
            notificationService.notifyUser(orgId, user.getId(), "Welcome to ZmartCredential!",
                    "Your provider portal is ready. Start by uploading your documents.", "UserCheck",
                    NotificationService.INFO);
            notificationService.notifyOrg(orgId, "Provider joined via invite code",
                    user.getDisplayName() + " (NPI " + req.npi() + ") created a provider account.", "UserPlus",
                    NotificationService.INFO);
        }
        return issueTokens(user);
    }

    private AuthResponse issueTokens(AppUser user) {
        String raw = cryptoService.randomToken(32);
        RefreshToken rt = new RefreshToken();
        rt.setUserId(user.getId());
        rt.setTokenHash(CryptoService.sha256Hex(raw));
        rt.setExpiresAt(LocalDateTime.now().plusDays(props.jwt().refreshTokenDays()));
        refreshTokenRepository.save(rt);
        return new AuthResponse(jwtService.issueAccessToken(user), raw, jwtService.accessTokenTtlSeconds(), toMe(user));
    }

    private MeResponse toMe(AppUser user) {
        String orgName = user.getOrgId() == null ? null
                : organizationRepository.findById(user.getOrgId()).map(Organization::getName).orElse(null);
        Role role = Role.fromCode(user.getRole());
        Map<String, Boolean> matrix = permissionService.matrix(user.getOrgId());
        Map<String, List<String>> perms = new LinkedHashMap<>();
        for (String entity : PermissionService.ENTITIES) {
            List<String> allowed = new ArrayList<>();
            for (String action : PermissionService.ACTIONS) {
                if (role == Role.PLATFORM_ADMIN
                        || matrix.getOrDefault(PermissionService.key(entity, action,
                        PermissionService.permissionRole(role.code(), user.getUserRoleId())), false)) {
                    allowed.add(action);
                }
            }
            perms.put(entity, allowed);
        }
        return new MeResponse(user.getId(), user.getUsername(), user.getDisplayName(), user.getEmail(),
                user.getTitle(), role.code(), user.getOrgId(), orgName, user.getProviderId(), perms);
    }

    private void createDefaultChannels(Long orgId, Long userId) {
        String[][] defaults = {
                {"general", "Company-wide discussion", "Hash"},
                {"credentialing", "Credentialing workflows and questions", "ShieldCheck"},
                {"payers", "Payer updates, portal issues, submission notes", "CreditCard"},
                {"announcements", "Important company announcements", "Megaphone"}};
        for (String[] d : defaults) {
            ChatChannel ch = new ChatChannel();
            ch.setOrgId(orgId);
            ch.setName(d[0]);
            ch.setDescription(d[1]);
            ch.setIcon(d[2]);
            ch.setCreatedBy(userId);
            chatChannelRepository.save(ch);
        }
    }

    private String generateInviteCode() {
        String code;
        do {
            code = "ZMARTC-" + cryptoService.randomToken(2).toUpperCase();
        } while (organizationRepository.existsByInviteCode(code));
        return code;
    }
}
