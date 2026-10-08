package com.zmartcredential.service;

import com.zmartcredential.dto.organization.TestDataDtos.TestDataCounts;
import com.zmartcredential.dto.organization.TestDataDtos.TestDataRequest;
import com.zmartcredential.dto.organization.TestDataDtos.TestDataResult;
import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.Enrollment;
import com.zmartcredential.entity.Location;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.ProviderDocument;
import com.zmartcredential.entity.Task;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.ClientRepository;
import com.zmartcredential.repository.EnrollmentRepository;
import com.zmartcredential.repository.LocationRepository;
import com.zmartcredential.repository.PayerRepository;
import com.zmartcredential.repository.PracticeRepository;
import com.zmartcredential.repository.ProviderDocumentRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.repository.TaskRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Test data generator (prototype TestDataGenerator / buildTestData). Every generated row is flagged
 * is_test_data = 1 in the current organization so it can be purged later.
 */
@Service
@RequiredArgsConstructor
public class OrgTestDataService {

    public static final String TEST_PASSWORD = "TestData123!";

    private static final String[] SPECIALTIES = {"Family Medicine", "Internal Medicine", "Cardiology", "Pediatrics",
            "Dermatology", "Orthopedic Surgery", "Psychiatry", "OB/GYN"};
    private static final String[] STATES = {"TX", "CA", "NY", "FL", "IL", "PA", "MA", "GA", "NC", "WA"};
    private static final String[] FIRST_NAMES = {"Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery",
            "Quinn", "Sam", "Blake", "Rachel", "Priya", "Kenji", "Olivia", "Marcus", "Diana", "Yusuf", "Zara", "Elena", "Ryan"};
    private static final String[] LAST_NAMES = {"Patel", "Kim", "Nguyen", "Garcia", "Martinez", "Johnson", "Williams",
            "Brown", "Jones", "Davis", "Rodriguez", "Wilson", "Anderson", "Thomas", "Jackson", "Harris", "Clark",
            "Lewis", "Walker", "Hall"};
    private static final String[] SUFFIXES = {"MD", "DO", "NP", "PA"};
    private static final String[] PROVIDER_STATUSES = {"active", "active", "active", "draft", "pending"};

    /** name, type, city, state, address, zip, lat, lng */
    private static final String[][] LOCATIONS = {
            {"Downtown Medical Center", "Primary", "Houston", "TX", "1200 Main Street", "77002", "29.754300", "-95.367700"},
            {"Westside Clinic", "Satellite", "Los Angeles", "CA", "5500 Wilshire Blvd", "90036", "34.062500", "-118.350000"},
            {"Harbor Family Practice", "Satellite", "Boston", "MA", "250 Harbor Way", "02110", "42.355000", "-71.042000"},
            {"Northside Specialty Center", "Primary", "Chicago", "IL", "3000 Lake Shore Dr", "60657", "41.942000", "-87.639000"},
            {"Admin HQ", "Admin Office", "Austin", "TX", "100 Congress Ave", "78701", "30.265000", "-97.743000"}};

    /** username, displayName, role, title, email local part, disabled */
    private static final String[][] USERS = {
            {"org.admin.1", "Owen Admin", "org_admin", "Executive Director", "owen", "0"},
            {"org.admin.2", "Olga Director", "org_admin", "Chief Credentialing Officer", "olga", "0"},
            {"clerk.1", "Carla Clerk", "clerk", "Senior Credentialing Specialist", "carla", "0"},
            {"clerk.2", "Chris Credentials", "clerk", "Credentialing Specialist", "chris", "0"},
            {"clerk.3", "Caleb Carson", "clerk", "Junior Credentialing Specialist", "caleb", "1"},
            {"auditor", "Audrey Auditor", "auditor", "Compliance Reviewer", "audrey", "0"},
            {"test.provider", "Dr. Test Provider", "provider", "MD", "test.provider", "0"}};

    private static final String[] TASK_TITLES = {
            "Follow up with BCBS on Dr. Patel enrollment", "Collect updated malpractice COI for Dr. Kim",
            "Verify DEA renewal for Dr. Nguyen", "Complete Aetna recredentialing for Dr. Garcia",
            "Request CAQH re-attestation from Dr. Martinez", "Submit UHC roster addition for 3 new providers",
            "Reconcile Humana roster against our records", "Schedule committee review of appeal",
            "Update location address with payer", "Resolve NPI mismatch issue",
            "Clear OIG exclusion false positive", "Send welcome letter to approved provider",
            "Audit Q2 enrollment completeness", "Prepare board certification evidence",
            "Review Molina contract amendment", "Investigate Cigna claim denial pattern",
            "Follow up on Wellcare application 45 days out", "Request fingerprinting for new hire",
            "Complete sanction check cycle", "Prepare monthly credentialing committee report"};
    private static final String[] TASK_STATUSES = {"open", "open", "open", "in_progress", "in_progress", "done"};
    private static final String[] TASK_PRIORITIES = {"high", "medium", "medium", "low"};

    private final ProviderRepository providerRepository;
    private final ProviderDocumentRepository documentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LocationRepository locationRepository;
    private final AppUserRepository userRepository;
    private final TaskRepository taskRepository;
    private final ClientRepository clientRepository;
    private final PracticeRepository practiceRepository;
    private final PayerRepository payerRepository;
    private final ProviderDocumentInitializer documentInitializer;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public TestDataCounts summary() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        return totals(authContext.orgId());
    }

    @Transactional
    public TestDataResult generate(TestDataRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        Long orgId = authContext.orgId();
        int nProviders = req.providers() == null ? 15 : req.providers();
        int nLocations = req.locations() == null ? 5 : req.locations();
        int nUsers = req.users() == null ? 7 : req.users();
        int nTasks = req.tasks() == null ? 20 : req.tasks();
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        LocalDate today = LocalDate.now();

        // Locations
        List<Location> locations = new ArrayList<>();
        for (int i = 0; i < nLocations; i++) {
            String[] t = LOCATIONS[i % LOCATIONS.length];
            int round = i / LOCATIONS.length;
            Location l = new Location();
            l.setOrgId(orgId);
            l.setName(round == 0 ? t[0] : t[0] + " " + (round + 1));
            l.setLocationType(t[1]);
            l.setCity(t[2]);
            l.setState(t[3]);
            l.setAddress(round == 0 ? t[4] : (100 + round * 10) + " " + t[4].replaceFirst("^\\d+ ", ""));
            l.setZip(t[5]);
            l.setPhone("(" + String.valueOf(300 + i * 11).substring(String.valueOf(300 + i * 11).length() - 3)
                    + ") 555-" + last4(2000 + i * 83));
            l.setLat(new BigDecimal(t[6]).add(BigDecimal.valueOf(round * 0.01)).setScale(6, RoundingMode.HALF_UP));
            l.setLng(new BigDecimal(t[7]).add(BigDecimal.valueOf(round * 0.01)).setScale(6, RoundingMode.HALF_UP));
            l.setActive(!"Admin Office".equals(t[1]));
            l.setTestData(true);
            locations.add(l);
        }
        locations = locationRepository.saveAll(locations);
        List<Location> activeLocations = locations.stream().filter(l -> Boolean.TRUE.equals(l.getActive())).toList();

        // Providers (+ document checklist)
        Set<String> usedNpis = new HashSet<>();
        List<Provider> providers = new ArrayList<>();
        for (int i = 0; i < nProviders; i++) {
            String first = FIRST_NAMES[i % FIRST_NAMES.length];
            String last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
            String state = STATES[i % STATES.length];
            String specialty = SPECIALTIES[i % SPECIALTIES.length];
            String suffix = SUFFIXES[i % 4];
            Provider p = new Provider();
            p.setOrgId(orgId);
            p.setFirstName(first);
            p.setLastName(last);
            p.setSuffix(suffix);
            p.setSpecialty(specialty);
            p.setPractitionerType(switch (suffix) {
                case "NP" -> "Nurse Practitioner";
                case "PA" -> "Physician Assistant";
                default -> "Physician";
            });
            p.setTaxonomyCode("Cardiology".equals(specialty) ? "207RC0000X"
                    : "Internal Medicine".equals(specialty) ? "207R00000X" : "207Q00000X");
            p.setNpi(uniqueNpi(orgId, usedNpis, rnd));
            p.setEmail(first.toLowerCase(Locale.ROOT) + "." + last.toLowerCase(Locale.ROOT) + "@test.com");
            p.setPhone("(" + String.valueOf(200 + i * 7).substring(String.valueOf(200 + i * 7).length() - 3)
                    + ") 555-" + last4(1000 + i * 73));
            p.setLicenseState(state);
            p.setLicenseNumber(state + "-" + String.valueOf(100000 + i * 1337).substring(String.valueOf(100000 + i * 1337).length() - 6));
            p.setLicenseExpires(today.plusDays(rnd.nextInt(30, 731)));
            if (!"PA".equals(suffix)) {
                p.setDeaNumber("B" + Character.toUpperCase(last.charAt(0)) + String.format("%07d", rnd.nextInt(10_000_000)));
                p.setDeaExpires(today.plusDays(rnd.nextInt(-60, 731)));
            }
            p.setCaqhId(rnd.nextDouble() > 0.3 ? String.format("%08d", (10000000 + i * 1234567L) % 100000000) : null);
            p.setStatus(PROVIDER_STATUSES[i % PROVIDER_STATUSES.length]);
            p.setSource("manual");
            p.setDateAdded(today.minusDays(rnd.nextInt(1, 181)));
            if (!activeLocations.isEmpty()) p.setLocationId(activeLocations.get(i % activeLocations.size()).getId());
            p.setTestData(true);
            p = providerRepository.save(p);
            documentInitializer.initialize(p);
            applyDocStatuses(p, rnd, today);
            providers.add(p);
        }

        // Enrollments
        List<Payer> payers = payerRepository.findByActiveTrueOrderBySortOrderAsc();
        List<Enrollment> enrollments = new ArrayList<>();
        for (int i = 0; i < providers.size(); i++) {
            int n = req.enrollmentsPerProvider() == null ? 2 + (i % 5) : req.enrollmentsPerProvider();
            List<Payer> shuffled = new ArrayList<>(payers);
            Collections.shuffle(shuffled, rnd);
            for (Payer payer : shuffled.subList(0, Math.min(n, shuffled.size()))) {
                enrollments.add(buildEnrollment(orgId, providers.get(i).getId(), payer.getId(), rnd, today));
            }
        }
        enrollmentRepository.saveAll(enrollments);

        // Users
        List<AppUser> users = new ArrayList<>();
        String hash = nUsers > 0 ? passwordEncoder.encode(TEST_PASSWORD) : null;
        boolean providerLoginUsed = false;
        for (int i = 0; i < nUsers; i++) {
            String[] t = USERS[i % USERS.length];
            if ("provider".equals(t[2])) {
                Provider target = providers.isEmpty() ? null : providers.getFirst();
                if (providerLoginUsed || target == null || userRepository.findByProviderId(target.getId()).isPresent()) {
                    t = USERS[3]; // fall back to a clerk
                } else {
                    providerLoginUsed = true;
                }
            }
            AppUser u = new AppUser();
            u.setOrgId(orgId);
            u.setUsername(uniqueUsername(t[0] + ".o" + orgId));
            u.setEmail(uniqueEmail(t[4] + ".o" + orgId, "test-org.com"));
            u.setPasswordHash(hash);
            u.setDisplayName(t[1]);
            u.setTitle(t[3]);
            u.setRole(t[2]);
            u.setDisabled("1".equals(t[5]));
            if ("provider".equals(t[2])) u.setProviderId(providers.getFirst().getId());
            u.setTestData(true);
            users.add(userRepository.save(u));
        }

        // Tasks
        List<AppUser> clerks = users.stream()
                .filter(u -> "clerk".equals(u.getRole()) && !Boolean.TRUE.equals(u.getDisabled())).toList();
        List<Task> tasks = new ArrayList<>();
        for (int i = 0; i < nTasks; i++) {
            Task t = new Task();
            t.setOrgId(orgId);
            t.setTitle(TASK_TITLES[i % TASK_TITLES.length]);
            t.setDescription("Auto-generated test task #" + (i + 1));
            t.setStatus(TASK_STATUSES[i % TASK_STATUSES.length]);
            t.setPriority(TASK_PRIORITIES[i % TASK_PRIORITIES.length]);
            t.setDueDate(today.plusDays(rnd.nextInt(-10, 51)));
            int slot = i % 3;
            if (slot < 2 && !clerks.isEmpty()) t.setAssigneeUserId(clerks.get(slot % clerks.size()).getId());
            if (!providers.isEmpty() && i % 2 == 0) t.setProviderId(providers.get(i % providers.size()).getId());
            t.setCreatedBy(authContext.userId());
            if ("done".equals(t.getStatus())) t.setCompletedAt(LocalDateTime.now().minusDays(rnd.nextInt(0, 10)));
            t.setTestData(true);
            tasks.add(t);
        }
        taskRepository.saveAll(tasks);

        TestDataCounts created = new TestDataCounts(providers.size(), enrollments.size(), locations.size(),
                users.size(), tasks.size(), 0, 0);
        notificationService.notifyOrg(orgId, "Test data generated",
                created.providers() + " providers, " + created.enrollments() + " enrollments, " + created.locations()
                        + " locations, " + created.users() + " users, " + created.tasks() + " tasks",
                "FlaskConical", NotificationService.INFO);
        return new TestDataResult(created, totals(orgId), users.isEmpty() ? null : TEST_PASSWORD);
    }

    @Transactional
    public TestDataCounts purge() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        return purgeOrg(authContext.orgId());
    }

    /** Deletes every test row of the org (also used by the JSON import, which replaces test data). */
    TestDataCounts purgeOrg(Long orgId) {
        int tasks = taskRepository.orgDeleteTestData(orgId);
        int enrollments = enrollmentRepository.orgDeleteTestData(orgId);
        int users = userRepository.orgDeleteTestData(orgId, authContext.userId());
        int providers = providerRepository.orgDeleteTestData(orgId); // cascades documents, remaining enrollments...
        int locations = locationRepository.orgDeleteTestData(orgId); // provider.location_id -> NULL
        int practices = practiceRepository.orgDeleteTestData(orgId); // location/provider/enrollment practice_id -> NULL
        int clients = clientRepository.orgDeleteTestData(orgId); // cascades their remaining practices
        return new TestDataCounts(providers, enrollments, locations, users, tasks, clients, practices);
    }

    // ---------- helpers ----------

    TestDataCounts totals(Long orgId) {
        return new TestDataCounts(providerRepository.countByOrgIdAndTestDataTrue(orgId),
                enrollmentRepository.countByOrgIdAndTestDataTrue(orgId),
                locationRepository.countByOrgIdAndTestDataTrue(orgId),
                userRepository.countByOrgIdAndTestDataTrue(orgId),
                taskRepository.countByOrgIdAndTestDataTrue(orgId),
                clientRepository.countByOrgIdAndTestDataTrue(orgId),
                practiceRepository.countByOrgIdAndTestDataTrue(orgId));
    }

    private void applyDocStatuses(Provider p, ThreadLocalRandom rnd, LocalDate today) {
        Map<String, int[]> ranges = Map.of(
                "medical_license", new int[]{30, 730},
                "dea", new int[]{-60, 730},
                "malpractice", new int[]{10, 365},
                "board_cert", new int[]{100, 1500},
                "gov_id", new int[]{200, 1500},
                "cv", new int[0],
                "w9", new int[0]);
        List<ProviderDocument> changed = new ArrayList<>();
        for (ProviderDocument d : documentRepository.findByProviderId(p.getId())) {
            int[] range = ranges.get(d.getDocType());
            if (range == null) continue;
            double r = rnd.nextDouble();
            String status = r < 0.65 ? "approved" : r < 0.75 ? "expired" : r < 0.85 ? "pending" : "missing";
            d.setStatus(status);
            if (!"missing".equals(status) && range.length == 2) {
                d.setExpiresAt("expired".equals(status) ? today.minusDays(rnd.nextInt(1, 91))
                        : today.plusDays(Math.max(1, rnd.nextInt(range[0], range[1] + 1))));
            }
            if (!"missing".equals(status)) d.setUploadedAt(LocalDateTime.now().minusDays(rnd.nextInt(1, 120)));
            changed.add(d);
        }
        documentRepository.saveAll(changed);
    }

    private Enrollment buildEnrollment(Long orgId, Long providerId, Long payerId, ThreadLocalRandom rnd, LocalDate today) {
        Enrollment e = new Enrollment();
        e.setOrgId(orgId);
        e.setProviderId(providerId);
        e.setPayerId(payerId);
        e.setApplicationType("initial");
        e.setTestData(true);
        double roll = rnd.nextDouble();
        if (roll < 0.45) {
            e.setStatus("approved");
            LocalDate submitted = today.minusDays(rnd.nextInt(60, 241));
            LocalDate effective = submitted.plusDays(rnd.nextInt(30, 121));
            if (effective.isAfter(today)) effective = today;
            e.setSubmittedDate(submitted);
            e.setEffectiveDate(effective);
            e.setTatDays((int) ChronoUnit.DAYS.between(submitted, effective));
        } else if (roll < 0.70) {
            e.setStatus("submitted");
            e.setSubmittedDate(today.minusDays(rnd.nextInt(5, 91)));
        } else if (roll < 0.80) {
            e.setStatus("in_progress");
        } else if (roll < 0.90) {
            e.setStatus("needs_attention");
            e.setSubmittedDate(today.minusDays(rnd.nextInt(45, 121)));
        } else if (roll < 0.95) {
            e.setStatus("draft");
        } else {
            e.setStatus("terminated");
            LocalDate submitted = today.minusDays(rnd.nextInt(180, 366));
            e.setSubmittedDate(submitted);
            e.setEffectiveDate(submitted.plusDays(rnd.nextInt(30, 61)));
        }
        return e;
    }

    /** Random NPI with a valid Luhn check digit (prefix 80840), unique within the org. */
    private String uniqueNpi(Long orgId, Set<String> used, ThreadLocalRandom rnd) {
        while (true) {
            StringBuilder base = new StringBuilder().append(rnd.nextInt(1, 3));
            for (int k = 0; k < 8; k++) base.append(rnd.nextInt(10));
            String npi = base + String.valueOf(npiCheckDigit(base.toString()));
            if (used.add(npi) && !providerRepository.existsByOrgIdAndNpi(orgId, npi)) return npi;
        }
    }

    static int npiCheckDigit(String nineDigits) {
        int sum = 24; // contribution of the "80840" prefix
        boolean dbl = true;
        for (int i = nineDigits.length() - 1; i >= 0; i--) {
            int d = nineDigits.charAt(i) - '0';
            if (dbl) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            dbl = !dbl;
        }
        return (10 - (sum % 10)) % 10;
    }

    private String uniqueUsername(String base) {
        String candidate = base;
        for (int n = 2; userRepository.existsByUsername(candidate) || userRepository.existsByEmail(candidate); n++) {
            candidate = base + "." + n;
        }
        return candidate;
    }

    private String uniqueEmail(String local, String domain) {
        String candidate = local + "@" + domain;
        for (int n = 2; userRepository.existsByEmail(candidate) || userRepository.existsByUsername(candidate); n++) {
            candidate = local + "." + n + "@" + domain;
        }
        return candidate;
    }

    private static String last4(int n) {
        String s = String.valueOf(n);
        return s.substring(s.length() - 4);
    }
}
