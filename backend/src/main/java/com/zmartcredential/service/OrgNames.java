package com.zmartcredential.service;

import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.repository.OrganizationRepository;
import java.util.Locale;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Organization names are unique: "ACME Medical" and " acme  medical " are the same name (case and spaces ignored).
 * Checked when the super admin creates an admin, at sign-up and when an organization is renamed.
 */
@Component
@RequiredArgsConstructor
public class OrgNames {

    public static final String TAKEN = "An organization with this name already exists — enter another name";

    private final OrganizationRepository organizationRepository;

    /** True when another organization (not {@code exceptOrgId}) already has this name. */
    public boolean taken(String name, Long exceptOrgId) {
        String n = normalize(name);
        if (n.isEmpty()) return false;
        return organizationRepository.findAll().stream()
                .anyMatch(o -> !Objects.equals(o.getId(), exceptOrgId) && n.equals(normalize(o.getName())));
    }

    /** Throws a conflict on {@code field} when the name is used by another organization. */
    public void requireFree(String name, Long exceptOrgId, String field) {
        if (taken(name, exceptOrgId)) throw ConflictException.onField(field, TAKEN);
    }

    static String normalize(String name) {
        return name == null ? "" : name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
