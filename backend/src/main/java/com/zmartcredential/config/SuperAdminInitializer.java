package com.zmartcredential.config;

import com.zmartcredential.entity.AppUser;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.security.Role;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Per-site super admin sign-in. When app.super-admin.email and app.super-admin.password are set in
 * the site's application.properties, the site's super admin signs in with them: the seeded super admin
 * (dev@desss.com, migration V107) is renamed to that email and its password is set. Left out = unchanged.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SuperAdminInitializer implements ApplicationRunner {

    private static final String SEEDED_EMAIL = "dev@desss.com";

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.super-admin.email:}")
    private String email;

    @Value("${app.super-admin.password:}")
    private String password;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String e = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (e.isEmpty() || password == null || password.isEmpty()) return;

        AppUser admin = userRepository.findByUsernameOrEmail(e, e).orElse(null);
        if (admin != null && !Role.PLATFORM_ADMIN.code().equals(admin.getRole())) {
            log.error("app.super-admin.email {} belongs to a non-super-admin account — super admin left unchanged", e);
            return;
        }
        if (admin == null) {
            // rename the seeded super admin, or create one when there is none
            List<AppUser> admins = userRepository.findAll().stream()
                    .filter(u -> Role.PLATFORM_ADMIN.code().equals(u.getRole())).toList();
            admin = admins.stream().filter(u -> SEEDED_EMAIL.equalsIgnoreCase(u.getUsername())).findFirst()
                    .orElse(admins.size() == 1 ? admins.getFirst() : null);
            if (admin == null) {
                admin = new AppUser();
                admin.setRole(Role.PLATFORM_ADMIN.code());
                admin.setFirstName("Super");
                admin.setLastName("Admin");
                admin.setDisplayName("Super Admin");
                admin.setTitle("Super Admin");
            }
            admin.setUsername(e);
            admin.setEmail(e);
            admin.setOrgId(null);
            admin.setDisabled(false);
            admin.setPasswordHash(passwordEncoder.encode(password));
            userRepository.save(admin);
            log.info("Super admin sign-in set to {}", e);
            return;
        }
        if (!passwordEncoder.matches(password, admin.getPasswordHash()) || Boolean.TRUE.equals(admin.getDisabled())) {
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setDisabled(false);
            userRepository.save(admin);
            log.info("Super admin password for {} updated from the settings", e);
        }
    }
}
