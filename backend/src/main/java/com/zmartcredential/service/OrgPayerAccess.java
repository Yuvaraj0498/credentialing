package com.zmartcredential.service;

import com.zmartcredential.entity.OrgPayerSetting;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.repository.OrgPayerSettingRepository;
import com.zmartcredential.security.AuthContext;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Which payers an organization's users see. A payer added by the super admin is on for every organization; one
 * added by an organization's admin is on only for that organization. The super admin switches payers on / off per
 * organization (Organizations → Payers), which overrides the default. The super admin always sees every payer.
 */
@Component
@RequiredArgsConstructor
public class OrgPayerAccess {

    private final OrgPayerSettingRepository repository;
    private final AuthContext authContext;

    /** payer id → enabled, for the payers switched on / off explicitly for this organization. */
    public Map<Long, Boolean> settings(Long orgId) {
        if (orgId == null) return Map.of();
        return repository.findByOrgId(orgId).stream()
                .collect(Collectors.toMap(OrgPayerSetting::getPayerId, s -> !Boolean.FALSE.equals(s.getEnabled()), (a, b) -> b));
    }

    /** Whether the payer is on for the organization (settings from {@link #settings(Long)}). */
    public static boolean enabled(Payer p, Long orgId, Map<Long, Boolean> settings) {
        // a payer without a portal ("Is portal available" unticked) is not offered to organizations
        if (!Boolean.TRUE.equals(p.getPortalAvailable())) return false;
        Boolean explicit = settings.get(p.getId());
        if (explicit != null) return explicit;
        return p.getAddedByOrgId() == null || Objects.equals(p.getAddedByOrgId(), orgId);
    }

    public boolean enabled(Payer p, Long orgId) {
        return enabled(p, orgId, settings(orgId));
    }

    /** The payers the signed-in user may see (all of them for the super admin). */
    public List<Payer> visible(List<Payer> payers) {
        if (authContext.principal().isPlatformAdmin()) return payers;
        return forOrg(payers, authContext.principal().orgId());
    }

    public List<Payer> forOrg(List<Payer> payers, Long orgId) {
        Map<Long, Boolean> s = settings(orgId);
        return payers.stream().filter(p -> enabled(p, orgId, s)).toList();
    }
}
