package com.zmartcredential.service;

import com.zmartcredential.entity.OrgPayerSetting;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.repository.OrgPayerSettingRepository;
import com.zmartcredential.security.AuthContext;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Which payers an organization's users see. Every payer is available to every organization; the super admin can
 * switch a payer off for one organization (Organizations → Payers). The super admin always sees every payer.
 */
@Component
@RequiredArgsConstructor
public class OrgPayerAccess {

    private final OrgPayerSettingRepository repository;
    private final AuthContext authContext;

    public Set<Long> disabledFor(Long orgId) {
        if (orgId == null) return Set.of();
        return repository.findByOrgId(orgId).stream().filter(s -> Boolean.FALSE.equals(s.getEnabled()))
                .map(OrgPayerSetting::getPayerId).collect(Collectors.toSet());
    }

    /** The payers the signed-in user may see (all of them for the super admin). */
    public List<Payer> visible(List<Payer> payers) {
        if (authContext.principal().isPlatformAdmin()) return payers;
        return forOrg(payers, authContext.principal().orgId());
    }

    public List<Payer> forOrg(List<Payer> payers, Long orgId) {
        Set<Long> off = disabledFor(orgId);
        return off.isEmpty() ? payers : payers.stream().filter(p -> !off.contains(p.getId())).toList();
    }
}
