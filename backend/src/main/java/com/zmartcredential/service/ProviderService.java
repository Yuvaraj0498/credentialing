package com.zmartcredential.service;

import com.zmartcredential.common.PageResponse;
import com.zmartcredential.dto.provider.ProviderDocumentDtos.ProviderDocumentRow;
import com.zmartcredential.dto.provider.ProviderDtos.MyEnrollment;
import com.zmartcredential.dto.provider.ProviderDtos.MyProviderUpdateRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderAssignmentSummary;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderBulkAssignRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderBulkAssignResult;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderCreateRequest;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderDetail;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderEnrollmentCounts;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderListItem;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderLite;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderLocationCount;
import com.zmartcredential.dto.provider.ProviderDtos.ProviderUpdateRequest;
import com.zmartcredential.entity.Client;
import com.zmartcredential.entity.DocumentType;
import com.zmartcredential.entity.Enrollment;
import com.zmartcredential.entity.Location;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.Practice;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.ProviderDocument;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.ClientRepository;
import com.zmartcredential.repository.EnrollmentRepository;
import com.zmartcredential.repository.LocationRepository;
import com.zmartcredential.repository.PayerRepository;
import com.zmartcredential.repository.PracticeRepository;
import com.zmartcredential.repository.ProviderDocumentRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static com.zmartcredential.service.ProviderModuleSupport.blankToNull;
import static com.zmartcredential.service.ProviderModuleSupport.fullName;

@Service
@RequiredArgsConstructor
public class ProviderService {

    private static final Map<String, String> SORT_FIELDS = Map.of(
            "lastname", "lastName", "firstname", "firstName", "specialty", "specialty", "status", "status",
            "npi", "npi", "dateadded", "dateAdded", "createdat", "createdAt", "email", "email", "name", "lastName");

    private final ProviderRepository providerRepository;
    private final EmailRegistry emailRegistry;
    private final ProviderDocumentRepository documentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ClientRepository clientRepository;
    private final PracticeRepository practiceRepository;
    private final LocationRepository locationRepository;
    private final PayerRepository payerRepository;
    private final ProviderDocumentInitializer documentInitializer;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final PermissionService permissionService;
    private final ProviderModuleSupport support;
    private final AuthContext authContext;
    private final CryptoService cryptoService;

    // ---------- list / read ----------

    @Transactional(readOnly = true)
    public PageResponse<ProviderListItem> list(String q, String status, Long practiceId, Long locationId,
                                               Long clientId, Boolean unassigned, int page, int size, String sort) {
        permissionService.require("provider", "list");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Specification<Provider> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.equal(root.get("orgId"), orgId));
            // Every word must match somewhere (name in any order, suffix, specialty, email, NPI, CAQH ID),
            // so "Cahill John", "Cahill, John" and "John Cahill, MD" all find John Cahill. % and _ are literal.
            for (String word : searchWords(q)) {
                String like = "%" + likeEscape(word) + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.get("firstName")), like, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("lastName")), like, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("suffix")), like, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("specialty")), like, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("email")), like, LIKE_ESCAPE),
                        cb.like(root.get("npi"), like, LIKE_ESCAPE),
                        cb.like(root.get("caqhId"), like, LIKE_ESCAPE)));
            }
            if (status != null && !status.isBlank() && !"all".equals(status)) ps.add(cb.equal(root.get("status"), status));
            if (practiceId != null) ps.add(cb.equal(root.get("practiceId"), practiceId));
            if (locationId != null) ps.add(cb.equal(root.get("locationId"), locationId));
            if (clientId != null) ps.add(cb.equal(root.get("clientId"), clientId));
            if (Boolean.TRUE.equals(unassigned)) ps.add(cb.isNull(root.get("locationId")));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        int safeSize = Math.min(Math.max(size, 1), 200);
        Page<Provider> result = providerRepository.findAll(spec, PageRequest.of(Math.max(page, 0), safeSize, parseSort(sort)));
        List<Provider> providers = result.getContent();
        List<Long> ids = providers.stream().map(Provider::getId).toList();
        Map<String, DocumentType> types = support.docTypes();
        Map<Long, List<ProviderDocument>> docsByProvider = new HashMap<>();
        Map<Long, List<Enrollment>> enrByProvider = new HashMap<>();
        if (!ids.isEmpty()) {
            for (ProviderDocument d : documentRepository.findByProviderIdIn(ids)) {
                docsByProvider.computeIfAbsent(d.getProviderId(), k -> new ArrayList<>()).add(d);
            }
            for (Enrollment e : enrollmentRepository.findByProviderIdIn(ids)) {
                if (Objects.equals(e.getOrgId(), orgId)) {
                    enrByProvider.computeIfAbsent(e.getProviderId(), k -> new ArrayList<>()).add(e);
                }
            }
        }
        Map<Long, String> practiceNames = practiceNames(providers.stream().map(Provider::getPracticeId).toList());
        Map<Long, String> locationNames = locationNames(providers.stream().map(Provider::getLocationId).toList());
        return PageResponse.of(result, p -> new ProviderListItem(
                p.getId(), p.getFirstName(), p.getLastName(), p.getSuffix(), p.getSpecialty(), p.getStatus(),
                p.getEmail(), p.getPhone(), p.getNpi(), p.getCaqhId(),
                p.getClientId(), p.getPracticeId(), practiceNames.get(p.getPracticeId()),
                p.getLocationId(), locationNames.get(p.getLocationId()),
                p.getTelemed(), p.getSource(), p.getDateAdded(),
                support.progress(docsByProvider.getOrDefault(p.getId(), List.of()), types),
                enrollmentCounts(enrByProvider.getOrDefault(p.getId(), List.of()))));
    }

    @Transactional(readOnly = true)
    public List<ProviderLite> allLite() {
        permissionService.require("provider", "list");
        authContext.requireStaff();
        return providerRepository.findByOrgIdOrderByLastNameAsc(authContext.orgId()).stream()
                .sorted(Comparator.comparing((Provider p) -> safe(p.getLastName())).thenComparing(p -> safe(p.getFirstName())))
                .map(p -> new ProviderLite(p.getId(), fullName(p), p.getNpi(), p.getSpecialty(), p.getStatus(),
                        p.getLocationId()))
                .toList();
    }

    @Transactional
    public ProviderDetail get(Long id) {
        permissionService.require("provider", "read");
        return detail(support.loadAccessible(id));
    }

    // ---------- create / update ----------

    @Transactional
    public ProviderDetail create(ProviderCreateRequest req) {
        permissionService.require("provider", "create");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        requireComplete(req);
        String npi = blankToNull(req.npi());
        if (npi != null && providerRepository.existsByOrgIdAndNpi(orgId, npi)) {
            throw new ConflictException("A provider with NPI " + npi + " already exists in this organization");
        }
        emailRegistry.requireFreeForProvider(req.email(), null);
        Hierarchy h = resolveHierarchy(orgId, req.clientId(), req.practiceId(), req.locationId());
        Provider p = new Provider();
        p.setOrgId(orgId);
        p.setFirstName(req.firstName().trim());
        p.setLastName(req.lastName().trim());
        p.setSuffix(blankToNull(req.suffix()));
        p.setSpecialty(blankToNull(req.specialty()));
        p.setNpi(npi);
        p.setEmail(lower(req.email()));
        p.setPhone(blankToNull(req.phone()));
        p.setLicenseNumber(blankToNull(req.licenseNumber()));
        p.setLicenseState(upper(req.licenseState()));
        p.setLicenseExpires(req.licenseExpires());
        p.setPractitionerType(blankToNull(req.practitionerType()));
        p.setTaxonomyCode(blankToNull(req.taxonomyCode()));
        p.setGender(blankToNull(req.gender()));
        p.setDateOfBirth(req.dateOfBirth());
        p.setDeaNumber(blankToNull(req.deaNumber()));
        p.setDeaExpires(req.deaExpires());
        p.setBoardCert(blankToNull(req.boardCert()));
        p.setMalpracticeCarrier(blankToNull(req.malpracticeCarrier()));
        p.setCaqhId(blankToNull(req.caqhId()));
        p.setCaqhUsername(blankToNull(req.caqhUsername()));
        p.setCaqhPasswordEnc(cryptoService.encrypt(blankToNull(req.caqhPassword())));
        p.setPecosAccessGranted(req.pecosAccessGranted());
        p.setPecosUsername(Boolean.TRUE.equals(req.pecosAccessGranted()) ? blankToNull(req.pecosUsername()) : null);
        if (blankToNull(req.status()) != null) p.setStatus(req.status());
        p.setClientId(h.clientId());
        p.setPracticeId(h.practiceId());
        p.setLocationId(h.locationId());
        p.setTelemed(Boolean.TRUE.equals(req.telemed()));
        if (p.getStatus() == null) p.setStatus("draft");
        p.setSource("manual");
        p.setDateAdded(LocalDate.now());
        p = providerRepository.save(p);
        documentInitializer.initialize(p);
        notificationService.notifyOrg(orgId, "Provider added",
                fullName(p) + " was added" + (npi == null ? "" : " (NPI " + npi + ")") + ".",
                "UserPlus", NotificationService.SUCCESS);
        return detail(p);
    }

    @Transactional
    public ProviderDetail update(Long id, ProviderUpdateRequest req) {
        permissionService.require("provider", "update");
        Provider p = support.loadForStaff(id);
        Long orgId = p.getOrgId();
        String npi = req.npi().trim();
        providerRepository.findByOrgIdAndNpi(orgId, npi).filter(o -> !o.getId().equals(p.getId())).ifPresent(o -> {
            throw new ConflictException("NPI " + npi + " is already used by " + fullName(o));
        });
        Hierarchy h = resolveHierarchy(orgId, req.clientId(), req.practiceId(), req.locationId());
        p.setFirstName(req.firstName().trim());
        p.setLastName(req.lastName().trim());
        p.setSuffix(blankToNull(req.suffix()));
        p.setNpi(npi);
        p.setCaqhId(blankToNull(req.caqhId()));
        if (req.caqhUsername() != null) p.setCaqhUsername(blankToNull(req.caqhUsername()));
        if (req.caqhPassword() != null && !req.caqhPassword().isBlank()) p.setCaqhPasswordEnc(cryptoService.encrypt(req.caqhPassword()));
        if (req.pecosAccessGranted() != null) {
            p.setPecosAccessGranted(req.pecosAccessGranted());
            if (!req.pecosAccessGranted()) p.setPecosUsername(null);
        }
        if (req.pecosUsername() != null && !Boolean.FALSE.equals(p.getPecosAccessGranted())) p.setPecosUsername(blankToNull(req.pecosUsername()));
        p.setSpecialty(blankToNull(req.specialty()));
        emailRegistry.requireFreeForProvider(req.email(), p.getId());
        p.setEmail(lower(req.email()));
        p.setPhone(blankToNull(req.phone()));
        p.setLicenseNumber(blankToNull(req.licenseNumber()));
        p.setLicenseState(upper(req.licenseState()));
        p.setStatus(req.status());
        p.setClientId(h.clientId());
        p.setPracticeId(h.practiceId());
        p.setLocationId(h.locationId());
        if (req.licenseExpires() != null) {
            if (!req.licenseExpires().equals(p.getLicenseExpires()) && req.licenseExpires().isBefore(LocalDate.now())) {
                throw new BadRequestException("License Expires can't be in the past");
            }
            p.setLicenseExpires(req.licenseExpires());
        }
        if (req.taxonomyCode() != null) p.setTaxonomyCode(blankToNull(req.taxonomyCode()));
        if (req.deaNumber() != null) p.setDeaNumber(blankToNull(req.deaNumber()));
        if (req.deaExpires() != null) {
            if (!req.deaExpires().equals(p.getDeaExpires()) && req.deaExpires().isBefore(LocalDate.now())) {
                throw new BadRequestException("DEA Expiration can't be in the past");
            }
            p.setDeaExpires(req.deaExpires());
        }
        if (req.boardCert() != null) p.setBoardCert(blankToNull(req.boardCert()));
        if (req.malpracticeCarrier() != null) p.setMalpracticeCarrier(blankToNull(req.malpracticeCarrier()));
        if (req.practitionerType() != null) p.setPractitionerType(blankToNull(req.practitionerType()));
        if (req.gender() != null) p.setGender(blankToNull(req.gender()));
        if (req.ethnicity() != null) p.setEthnicity(blankToNull(req.ethnicity()));
        if (req.dateOfBirth() != null) p.setDateOfBirth(req.dateOfBirth());
        if (req.telemed() != null) p.setTelemed(req.telemed());
        providerRepository.save(p);
        return detail(p);
    }

    @Transactional
    public ProviderDetail updateStatus(Long id, String status) {
        permissionService.require("provider", "update");
        Provider p = support.loadForStaff(id);
        String old = p.getStatus();
        p.setStatus(status);
        providerRepository.save(p);
        if (!Objects.equals(old, status)) {
            notificationService.notifyOrg(p.getOrgId(), "Provider status changed",
                    fullName(p) + ": " + old + " -> " + status, "UserCog", NotificationService.INFO);
        }
        return detail(p);
    }

    @Transactional
    public ProviderDetail assign(Long id, Long locationId) {
        permissionService.require("provider", "update");
        Provider p = support.loadForStaff(id);
        applyLocation(p, locationId);
        providerRepository.save(p);
        return detail(p);
    }

    @Transactional
    public ProviderBulkAssignResult bulkAssign(ProviderBulkAssignRequest req) {
        permissionService.require("provider", "update");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Set<Long> ids = new HashSet<>(req.providerIds());
        List<Provider> providers = providerRepository.findAllById(ids).stream()
                .filter(p -> Objects.equals(p.getOrgId(), orgId)).toList();
        if (providers.size() != ids.size()) throw new NotFoundException("One or more providers were not found");
        Location loc = req.locationId() == null ? null : loadLocation(orgId, req.locationId());
        for (Provider p : providers) applyLocation(p, loc);
        providerRepository.saveAll(providers);
        return new ProviderBulkAssignResult(providers.size(), req.locationId(), loc == null ? null : loc.getName());
    }

    @Transactional(readOnly = true)
    public ProviderAssignmentSummary assignmentSummary() {
        permissionService.require("provider", "list");
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        List<Provider> providers = providerRepository.findByOrgId(orgId);
        Map<Long, Long> counts = new HashMap<>();
        long unassigned = 0;
        for (Provider p : providers) {
            if (p.getLocationId() == null) unassigned++;
            else counts.merge(p.getLocationId(), 1L, Long::sum);
        }
        List<Location> locations = locationRepository.findByOrgIdOrderByNameAsc(orgId);
        List<ProviderLocationCount> byLocation = locations.stream()
                .map(l -> new ProviderLocationCount(l.getId(), l.getName(), l.getLegalName(), l.getPracticeId(),
                        counts.getOrDefault(l.getId(), 0L)))
                .toList();
        return new ProviderAssignmentSummary(providers.size(), providers.size() - unassigned, unassigned,
                locations.size(), byLocation);
    }

    @Transactional
    public void delete(Long id) {
        permissionService.require("provider", "delete");
        Provider p = support.loadForStaff(id);
        List<String> keys = documentRepository.findByProviderId(p.getId()).stream()
                .map(ProviderDocument::getStorageKey).filter(Objects::nonNull).toList();
        providerRepository.delete(p);
        providerRepository.flush();
        keys.forEach(fileStorageService::delete);
        notificationService.notifyOrg(p.getOrgId(), "Provider deleted", fullName(p) + " was removed.",
                "UserMinus", NotificationService.WARN);
    }

    // ---------- provider self-service ----------

    @Transactional
    public ProviderDetail getMine() {
        return detail(loadMine());
    }

    @Transactional
    public ProviderDetail updateMine(MyProviderUpdateRequest req) {
        Provider p = loadMine();
        // partial update: fields left out of the request keep their value ("" clears a text field)
        if (req.phone() != null) p.setPhone(blankToNull(req.phone()));
        if (req.email() != null) {
            emailRegistry.requireFreeForProvider(req.email(), p.getId());
            p.setEmail(lower(req.email()));
        }
        if (req.specialty() != null) p.setSpecialty(blankToNull(req.specialty()));
        if (req.licenseNumber() != null) p.setLicenseNumber(blankToNull(req.licenseNumber()));
        if (req.licenseState() != null) p.setLicenseState(upper(req.licenseState()));
        if (req.licenseExpires() != null) p.setLicenseExpires(req.licenseExpires());
        providerRepository.save(p);
        if (p.getOrgId() != null) {
            notificationService.notifyOrg(p.getOrgId(), "Provider updated profile",
                    fullName(p) + " updated their contact / license details.", "UserCog", NotificationService.INFO);
        }
        return detail(p);
    }

    @Transactional(readOnly = true)
    public List<MyEnrollment> myEnrollments() {
        Provider p = loadMine();
        List<Enrollment> enrollments = enrollmentRepository.findByProviderId(p.getId()).stream()
                .filter(e -> Objects.equals(e.getOrgId(), p.getOrgId())).toList();
        Map<Long, Payer> payers = ProviderModuleSupport.index(
                payerRepository.findAllById(enrollments.stream().map(Enrollment::getPayerId).distinct().toList()),
                Payer::getId);
        return enrollments.stream().map(e -> {
            Payer payer = payers.get(e.getPayerId());
            return new MyEnrollment(e.getId(), e.getPayerId(), payer == null ? null : payer.getName(),
                    payer == null ? null : payer.getColor(), e.getStatus(), e.getApplicationType(),
                    e.getSubmittedDate(), e.getEffectiveDate(), e.getTatDays());
        }).toList();
    }

    private Provider loadMine() {
        Long providerId = authContext.requireOwnProviderId();
        Long orgId = authContext.principal().orgId();
        return providerRepository.findById(providerId)
                .filter(p -> Objects.equals(p.getOrgId(), orgId))
                .orElseThrow(() -> new NotFoundException("No provider profile is linked to your account"));
    }

    // ---------- helpers ----------

    ProviderDetail detail(Provider p) {
        List<ProviderDocumentRow> rows = support.documentRows(p);
        String clientName = p.getClientId() == null ? null
                : clientRepository.findById(p.getClientId()).map(Client::getName).orElse(null);
        String practiceName = p.getPracticeId() == null ? null
                : practiceRepository.findById(p.getPracticeId()).map(Practice::getName).orElse(null);
        String locationName = p.getLocationId() == null ? null
                : locationRepository.findById(p.getLocationId()).map(Location::getName).orElse(null);
        List<Enrollment> enrollments = enrollmentRepository.findByProviderId(p.getId()).stream()
                .filter(e -> Objects.equals(e.getOrgId(), p.getOrgId())).toList();
        return new ProviderDetail(p.getId(), p.getFirstName(), p.getLastName(), p.getSuffix(), p.getSpecialty(),
                p.getPractitionerType(), p.getTaxonomyCode(), p.getGender(), p.getEthnicity(), p.getDateOfBirth(),
                p.getNpi(), p.getEmail(), p.getPhone(),
                p.getLicenseNumber(), p.getLicenseState(), p.getLicenseExpires(),
                p.getDeaNumber(), p.getDeaExpires(), p.getBoardCert(), p.getMalpracticeCarrier(),
                p.getCaqhId(), p.getCaqhUsername(), p.getCaqhLastAttested(), p.getCaqhLastSynced(),
                p.getCaqhAttestationStatus(),
                p.getClientId(), clientName, p.getPracticeId(), practiceName, p.getLocationId(), locationName,
                p.getStatus(), p.getTelemed(), p.getSource(), p.getDateAdded(), p.getSelfSignup(),
                p.getCreatedAt(), p.getUpdatedAt(),
                support.progressFromRows(rows), enrollmentCounts(enrollments), rows,
                p.getCaqhPasswordEnc() != null, p.getPecosAccessGranted(), p.getPecosUsername());
    }

    record Hierarchy(Long clientId, Long practiceId, Long locationId) {
    }

    /**
     * Validates client/practice/location consistency within the org and derives parents from the most
     * specific level given (location -> practice -> client).
     */
    Hierarchy resolveHierarchy(Long orgId, Long clientId, Long practiceId, Long locationId) {
        if (locationId != null) {
            Location loc = loadLocation(orgId, locationId);
            if (practiceId != null && !Objects.equals(practiceId, loc.getPracticeId())) {
                throw new BadRequestException("The selected location does not belong to the selected practice");
            }
            practiceId = loc.getPracticeId();
        }
        if (practiceId != null) {
            Long pid = practiceId;
            Practice pr = practiceRepository.findByIdAndOrgId(pid, orgId)
                    .orElseThrow(() -> new BadRequestException("Practice " + pid + " was not found"));
            if (clientId != null && !Objects.equals(clientId, pr.getClientId())) {
                throw new BadRequestException("The selected practice does not belong to the selected client");
            }
            clientId = pr.getClientId();
        }
        if (clientId != null) {
            Long cid = clientId;
            clientRepository.findByIdAndOrgId(cid, orgId)
                    .orElseThrow(() -> new BadRequestException("Client " + cid + " was not found"));
        }
        return new Hierarchy(clientId, practiceId, locationId);
    }

    private void applyLocation(Provider p, Long locationId) {
        applyLocation(p, locationId == null ? null : loadLocation(p.getOrgId(), locationId));
    }

    private void applyLocation(Provider p, Location loc) {
        if (loc == null) {
            p.setLocationId(null);
            return;
        }
        Hierarchy h = resolveHierarchy(p.getOrgId(), null, null, loc.getId());
        p.setLocationId(h.locationId());
        p.setPracticeId(h.practiceId());
        p.setClientId(h.clientId());
    }

    private Location loadLocation(Long orgId, Long locationId) {
        return locationRepository.findByIdAndOrgId(locationId, orgId)
                .orElseThrow(() -> new BadRequestException("Location " + locationId + " was not found"));
    }

    private Map<Long, String> practiceNames(List<Long> ids) {
        List<Long> clean = ids.stream().filter(Objects::nonNull).distinct().toList();
        Map<Long, String> map = new HashMap<>();
        if (!clean.isEmpty()) practiceRepository.findAllById(clean).forEach(x -> map.put(x.getId(), x.getName()));
        return map;
    }

    private Map<Long, String> locationNames(List<Long> ids) {
        List<Long> clean = ids.stream().filter(Objects::nonNull).distinct().toList();
        Map<Long, String> map = new HashMap<>();
        if (!clean.isEmpty()) locationRepository.findAllById(clean).forEach(x -> map.put(x.getId(), x.getName()));
        return map;
    }

    private static ProviderEnrollmentCounts enrollmentCounts(List<Enrollment> enrollments) {
        int approved = (int) enrollments.stream().filter(e -> "approved".equals(e.getStatus())).count();
        return new ProviderEnrollmentCounts(enrollments.size(), approved);
    }

    private static Sort parseSort(String sort) {
        String field = "lastname";
        Sort.Direction dir = Sort.Direction.ASC;
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            field = parts[0].trim().toLowerCase(Locale.ROOT);
            if (parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim())) dir = Sort.Direction.DESC;
        }
        String prop = SORT_FIELDS.get(field);
        if (prop == null) throw new BadRequestException("Cannot sort by '" + field + "'");
        Sort s = Sort.by(dir, prop);
        if ("lastName".equals(prop)) s = s.and(Sort.by(dir, "firstName"));
        return s.and(Sort.by(Sort.Direction.ASC, "id"));
    }

    private static String safe(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    static String lower(String s) {
        String v = blankToNull(s);
        return v == null ? null : v.toLowerCase(Locale.ROOT);
    }

    static String upper(String s) {
        String v = blankToNull(s);
        return v == null ? null : v.toUpperCase(Locale.ROOT);
    }

    private static final java.util.Set<String> IGNORED_WORDS = java.util.Set.of("dr", "dr.");

    /** Search words: lower-case, split on spaces and commas, without titles like "Dr". */
    static List<String> searchWords(String q) {
        if (q == null || q.isBlank()) return List.of();
        return java.util.Arrays.stream(q.toLowerCase(Locale.ROOT).split("[\\s,]+"))
                .filter(w -> !w.isEmpty() && !IGNORED_WORDS.contains(w)).toList();
    }

    private static final char LIKE_ESCAPE = '!';

    /** Escapes LIKE wildcards so % and _ are searched for literally (escape character: !). */
    static String likeEscape(String s) {
        return s.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    /**
     * Adding a provider (manually, from CAQH, or from the Organization screen): every field of the provider form
     * is required, the same as in Edit Provider.
     */
    public static void requireComplete(ProviderCreateRequest req) {
        List<String> missing = new ArrayList<>();
        if (req.firstName() == null || req.firstName().isBlank()) missing.add("First Name");
        if (req.lastName() == null || req.lastName().isBlank()) missing.add("Last Name");
        if (blankToNull(req.suffix()) == null) missing.add("Suffix");
        if (blankToNull(req.npi()) == null) missing.add("NPI");
        if (blankToNull(req.specialty()) == null) missing.add("Specialty");
        if (blankToNull(req.email()) == null) missing.add("Email");
        if (blankToNull(req.phone()) == null) missing.add("Phone");
        else if (!req.phone().trim().matches("[0-9]{10}")) throw new BadRequestException("Phone must be 10 digits");
        if (blankToNull(req.licenseNumber()) == null) missing.add("License #");
        if (blankToNull(req.licenseState()) == null) missing.add("License State");
        if (req.licenseExpires() == null) missing.add("License Expires");
        else if (req.licenseExpires().isBefore(LocalDate.now())) throw new BadRequestException("License Expires can't be in the past");
        if (blankToNull(req.status()) == null) missing.add("Status");
        if (blankToNull(req.caqhId()) == null) missing.add("CAQH ID");
        else if (!req.caqhId().trim().matches("[0-9]{6,10}")) throw new BadRequestException("CAQH ID must be 6-10 digits");
        if (blankToNull(req.caqhUsername()) == null) missing.add("CAQH Username");
        if (blankToNull(req.caqhPassword()) == null) missing.add("CAQH Password");
        if (req.pecosAccessGranted() == null) missing.add("PECOS Access Granted");
        else if (req.pecosAccessGranted() && blankToNull(req.pecosUsername()) == null) missing.add("PECOS User Name");
        if (req.practiceId() == null) missing.add("Practice");
        if (req.locationId() == null) missing.add("Location");
        if (!missing.isEmpty()) throw new BadRequestException("Required: " + String.join(", ", missing));
    }
}
