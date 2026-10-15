package com.zmartcredential.service;

import com.zmartcredential.entity.MasterListItem;
import com.zmartcredential.entity.ProviderInvite;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.MasterListItemRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.ProviderInviteRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Master Data: the lists behind the dropdowns. Super admin additions are for everyone; an organization admin's
 * additions are for their organization only, except Specialty (everyone).
 */
@Service
@RequiredArgsConstructor
public class MasterListService {

    /** key → tab name; the order of the Master Data tabs */
    public static final Map<String, String> LISTS = new LinkedHashMap<>();
    static {
        LISTS.put("specialty", "Specialty");
        LISTS.put("suffix", "Suffix");
        LISTS.put("payer_category", "Payer Category");
        LISTS.put("location_type", "Location Type");
        LISTS.put("org_type", "Organization Type");
    }
    /** lists an organization admin adds to for everyone */
    private static final List<String> SHARED_BY_ADMINS = List.of("specialty");
    /** lists whose items store a code (existing records keep their codes) */
    private static final List<String> CODED = List.of("org_type");
    /** lists the public pages (sign-up, secure link) may read */
    private static final List<String> PUBLIC = List.of("specialty", "suffix", "org_type");

    private final MasterListItemRepository repository;
    private final ProviderInviteRepository inviteRepository;
    private final OrganizationRepository organizationRepository;
    private final AuthContext authContext;

    public record ListInfo(String key, String label) {
    }

    /** A dropdown option: value = what is stored, label = what is shown. */
    public record Option(String value, String label) {
    }

    public record ItemRow(Long id, String code, String value, int sortOrder, boolean active, boolean everyone,
                          String addedBy, boolean canEdit) {
    }

    public record ItemRequest(String value, Boolean active, Integer sortOrder) {
    }

    public List<ListInfo> lists() {
        return LISTS.entrySet().stream().map(e -> new ListInfo(e.getKey(), e.getValue())).toList();
    }

    /** Dropdown options for the signed-in user's organization (active only). */
    @Transactional(readOnly = true)
    public List<Option> options(String key) {
        requireKey(key);
        Long orgId = currentOrgOrNull();
        return visible(key, orgId).stream().filter(i -> Boolean.TRUE.equals(i.getActive())).map(MasterListService::option).toList();
    }

    /** Public pages: everyone's items, plus the organization's own when the secure link token is given. */
    @Transactional(readOnly = true)
    public List<Option> publicOptions(String key, String token) {
        if (!PUBLIC.contains(key)) throw NotFoundException.of("List", key);
        Long orgId = token == null || token.isBlank() ? null
                : inviteRepository.findByToken(token).map(ProviderInvite::getOrgId).orElse(null);
        return visible(key, orgId).stream().filter(i -> Boolean.TRUE.equals(i.getActive())).map(MasterListService::option).toList();
    }

    /** Master Data screen: every item the user can see, active or not. */
    @Transactional(readOnly = true)
    public List<ItemRow> manage(String key) {
        requireKey(key);
        requireManager();
        boolean superAdmin = authContext.hasRole(Role.PLATFORM_ADMIN);
        Long orgId = superAdmin ? null : authContext.orgId();
        List<MasterListItem> items = superAdmin ? sorted(repository.findByListKey(key)) : visible(key, orgId);
        Map<Long, String> orgNames = new java.util.HashMap<>();
        return items.stream().map(i -> {
            String by = i.getCreatedByOrgId() == null ? "Super Admin"
                    : orgNames.computeIfAbsent(i.getCreatedByOrgId(), id -> organizationRepository.findById(id)
                            .map(o -> o.getName()).orElse("Organization #" + id));
            return new ItemRow(i.getId(), i.getCode(), i.getValue(), i.getSortOrder() == null ? 0 : i.getSortOrder(),
                    Boolean.TRUE.equals(i.getActive()), i.getOrgId() == null, by, canEdit(i));
        }).toList();
    }

    @Transactional
    public ItemRow create(String key, ItemRequest req) {
        requireKey(key);
        requireManager();
        String value = cleanValue(key, req.value());
        boolean superAdmin = authContext.hasRole(Role.PLATFORM_ADMIN);
        Long myOrg = superAdmin ? null : authContext.orgId();
        Long targetOrg = superAdmin || SHARED_BY_ADMINS.contains(key) ? null : myOrg;
        checkDuplicate(key, value, null, myOrg);
        MasterListItem i = new MasterListItem();
        i.setListKey(key);
        i.setValue(value);
        if (CODED.contains(key)) i.setCode(uniqueCode(key, value));
        i.setSortOrder(req.sortOrder() != null ? req.sortOrder()
                : repository.findByListKey(key).stream().mapToInt(x -> x.getSortOrder() == null ? 0 : x.getSortOrder()).max().orElse(0) + 1);
        i.setActive(req.active() == null || req.active());
        i.setOrgId(targetOrg);
        i.setCreatedByOrgId(myOrg);
        i.setCreatedBy(authContext.userId());
        i = repository.save(i);
        return row(i);
    }

    @Transactional
    public ItemRow update(String key, Long id, ItemRequest req) {
        MasterListItem i = loadEditable(key, id);
        if (req.value() != null) {
            String value = cleanValue(key, req.value());
            checkDuplicate(key, value, id, authContext.hasRole(Role.PLATFORM_ADMIN) ? null : authContext.orgId());
            i.setValue(value);
        }
        if (req.active() != null) i.setActive(req.active());
        if (req.sortOrder() != null) i.setSortOrder(req.sortOrder());
        return row(repository.save(i));
    }

    @Transactional
    public void delete(String key, Long id) {
        repository.delete(loadEditable(key, id));
    }

    // ---------- helpers ----------

    private List<MasterListItem> visible(String key, Long orgId) {
        return sorted(repository.findByListKey(key).stream()
                .filter(i -> i.getOrgId() == null || Objects.equals(i.getOrgId(), orgId)).toList());
    }

    private static List<MasterListItem> sorted(List<MasterListItem> items) {
        return items.stream().sorted(Comparator.comparing((MasterListItem i) -> i.getSortOrder() == null ? 0 : i.getSortOrder())
                .thenComparing(i -> i.getValue().toLowerCase(Locale.ROOT))).toList();
    }

    private static Option option(MasterListItem i) {
        return new Option(i.getCode() != null ? i.getCode() : i.getValue(), i.getValue());
    }

    private ItemRow row(MasterListItem i) {
        return new ItemRow(i.getId(), i.getCode(), i.getValue(), i.getSortOrder() == null ? 0 : i.getSortOrder(),
                Boolean.TRUE.equals(i.getActive()), i.getOrgId() == null,
                i.getCreatedByOrgId() == null ? "Super Admin" : organizationRepository.findById(i.getCreatedByOrgId())
                        .map(o -> o.getName()).orElse("Organization"), canEdit(i));
    }

    /** Super admin: everything. Organization admin: what their organization added. */
    private boolean canEdit(MasterListItem i) {
        if (authContext.hasRole(Role.PLATFORM_ADMIN)) return true;
        return i.getCreatedByOrgId() != null && Objects.equals(i.getCreatedByOrgId(), authContext.orgId());
    }

    private MasterListItem loadEditable(String key, Long id) {
        requireKey(key);
        requireManager();
        MasterListItem i = repository.findById(id).filter(x -> x.getListKey().equals(key))
                .orElseThrow(() -> NotFoundException.of("Item", id));
        if (!canEdit(i)) throw new ForbiddenException("Only the organization that added this item (or the super admin) can change it");
        return i;
    }

    private void checkDuplicate(String key, String value, Long exceptId, Long orgId) {
        boolean dup = repository.findByListKey(key).stream()
                .filter(i -> !Objects.equals(i.getId(), exceptId))
                .filter(i -> orgId == null || i.getOrgId() == null || Objects.equals(i.getOrgId(), orgId))
                .anyMatch(i -> i.getValue().equalsIgnoreCase(value));
        if (dup || "other".equalsIgnoreCase(value) && "specialty".equals(key)) {
            throw ConflictException.onField("value", "\"" + value + "\" is already in the list");
        }
    }

    private String uniqueCode(String key, String value) {
        String base = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", "");
        if (base.isEmpty()) base = "item";
        if (base.length() > 32) base = base.substring(0, 32);
        String code = base;
        int n = 2;
        List<MasterListItem> all = repository.findByListKey(key);
        while (true) {
            String c = code;
            if (all.stream().noneMatch(i -> c.equals(i.getCode()))) return c;
            code = base + "_" + n++;
        }
    }

    /** the longest value each list can store (the column of the records that use it) */
    private static final Map<String, Integer> MAX_LENGTH = Map.of("specialty", 120, "suffix", 10, "payer_category", 40,
            "location_type", 30, "org_type", 100);

    private static String cleanValue(String key, String v) {
        String value = v == null ? "" : v.trim().replaceAll("\\s+", " ");
        if (value.isEmpty()) throw BadRequestException.onField("value", "Name is required");
        int max = MAX_LENGTH.getOrDefault(key, 150);
        if (value.length() > max) throw BadRequestException.onField("value", "At most " + max + " characters");
        return value;
    }

    private static void requireKey(String key) {
        if (!LISTS.containsKey(key)) throw NotFoundException.of("List", key);
    }

    private void requireManager() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
    }

    private Long currentOrgOrNull() {
        try {
            return authContext.orgIdOrNull();
        } catch (RuntimeException e) {
            return null;
        }
    }
}
