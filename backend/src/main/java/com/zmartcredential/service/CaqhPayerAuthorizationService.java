package com.zmartcredential.service;

import com.zmartcredential.dto.enrollment.CaqhAuthorizationItem;
import com.zmartcredential.dto.enrollment.CaqhAuthorizationListResponse;
import com.zmartcredential.dto.enrollment.CaqhAuthorizationSummaryItem;
import com.zmartcredential.entity.CaqhPayerAuthorization;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.repository.CaqhPayerAuthorizationRepository;
import com.zmartcredential.repository.PayerRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.AuthPrincipal;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Which payers may view a provider's CAQH profile. Only the DB side is implemented; pushing the
 * authorization to CAQH ProView and pulling data (last_data_pull) is a deferred integration.
 */
@Service
@RequiredArgsConstructor
public class CaqhPayerAuthorizationService {

    private final CaqhPayerAuthorizationRepository repository;
    private final OrgPayerAccess orgPayerAccess;
    private final PayerRepository payerRepository;
    private final ProviderRepository providerRepository;
    private final EnrollmentSupport support;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public CaqhAuthorizationListResponse list(Long providerId) {
        Provider provider = readableProvider(providerId);
        return build(provider);
    }

    @Transactional
    public CaqhAuthorizationItem update(Long providerId, Long payerId, boolean authorized) {
        Provider provider = writableProvider(providerId);
        Payer payer = support.payer(payerId);
        if (!EnrollmentSupport.isPrivatePayer(payer)) {
            throw new BadRequestException(payer.getName() + " is not managed through CAQH authorizations");
        }
        if (!Boolean.TRUE.equals(payer.getCaqhParticipating())) {
            throw new BadRequestException(payer.getName() + " does not participate in CAQH — a manual packet is required");
        }
        CaqhPayerAuthorization a = apply(provider, payer, authorized, LocalDateTime.now());
        return toItem(payer, a);
    }

    @Transactional
    public CaqhAuthorizationListResponse authorizeAll(Long providerId) {
        Provider provider = writableProvider(providerId);
        LocalDateTime now = LocalDateTime.now();
        for (Payer payer : capablePayers()) apply(provider, payer, true, now);
        return build(provider);
    }

    @Transactional(readOnly = true)
    public List<CaqhAuthorizationSummaryItem> summary() {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Set<Long> capable = capablePayers().stream().map(Payer::getId).collect(Collectors.toSet());
        List<Provider> providers = providerRepository.findByOrgIdOrderByLastNameAsc(orgId);
        Map<Long, Long> counts = providers.isEmpty() ? Map.of()
                : repository.findByProviderIdIn(providers.stream().map(Provider::getId).toList()).stream()
                .filter(a -> Boolean.TRUE.equals(a.getAuthorized()) && capable.contains(a.getPayerId()))
                .collect(Collectors.groupingBy(CaqhPayerAuthorization::getProviderId, Collectors.counting()));
        return providers.stream().map(p -> new CaqhAuthorizationSummaryItem(p.getId(), EnrollmentSupport.fullName(p),
                p.getNpi(), p.getCaqhId(), counts.getOrDefault(p.getId(), 0L).intValue(), capable.size())).toList();
    }

    private CaqhPayerAuthorization apply(Provider provider, Payer payer, boolean authorized, LocalDateTime now) {
        CaqhPayerAuthorization a = repository.findByProviderIdAndPayerId(provider.getId(), payer.getId()).orElseGet(() -> {
            CaqhPayerAuthorization n = new CaqhPayerAuthorization();
            n.setProviderId(provider.getId());
            n.setPayerId(payer.getId());
            n.setAuthorized(false);
            return n;
        });
        a.setOrgId(provider.getOrgId());
        boolean was = Boolean.TRUE.equals(a.getAuthorized());
        if (authorized && !was) {
            a.setAuthorized(true);
            a.setAuthorizedAt(now);
            a.setRevokedAt(null);
        } else if (authorized) {
            a.setRevokedAt(null); // bulk authorize clears any stale revocation (prototype bug B6)
        } else if (was) {
            a.setAuthorized(false);
            a.setRevokedAt(now); // authorizedAt is kept as history
        }
        a.setUpdatedBy(authContext.userId());
        return repository.save(a);
    }

    private CaqhAuthorizationListResponse build(Provider provider) {
        // prototype v3: private payers only (Medicare/PECOS, state Medicaid and TRICARE/VA are not authorized via CAQH here)
        List<Payer> active = orgPayerAccess.forOrg(payerRepository.findByActiveTrueOrderBySortOrderAsc(), provider.getOrgId()).stream()
                .filter(EnrollmentSupport::isPrivatePayer).toList();
        Map<Long, CaqhPayerAuthorization> auths = repository.findByProviderId(provider.getId()).stream()
                .collect(Collectors.toMap(CaqhPayerAuthorization::getPayerId, Function.identity(), (x, y) -> x));
        List<CaqhAuthorizationItem> items = active.stream().filter(p -> Boolean.TRUE.equals(p.getCaqhParticipating()))
                .map(p -> toItem(p, auths.get(p.getId()))).toList();
        List<CaqhAuthorizationListResponse.NonCaqhPayer> non = active.stream()
                .filter(p -> !Boolean.TRUE.equals(p.getCaqhParticipating()))
                .map(p -> new CaqhAuthorizationListResponse.NonCaqhPayer(p.getId(), p.getName(), p.getColor(), p.getPortalUrl()))
                .toList();
        int authorizedCount = (int) items.stream().filter(CaqhAuthorizationItem::authorized).count();
        return new CaqhAuthorizationListResponse(provider.getId(), EnrollmentSupport.fullName(provider), provider.getCaqhId(),
                provider.getCaqhLastAttested(), provider.getCaqhAttestationStatus(), authorizedCount, items.size(), items, non);
    }

    private List<Payer> capablePayers() {
        return payerRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .filter(EnrollmentSupport::isPrivatePayer)
                .filter(p -> Boolean.TRUE.equals(p.getCaqhParticipating())).toList();
    }

    private static CaqhAuthorizationItem toItem(Payer p, CaqhPayerAuthorization a) {
        return new CaqhAuthorizationItem(p.getId(), p.getCode(), p.getName(), p.getColor(), p.getPortalUrl(),
                a != null && Boolean.TRUE.equals(a.getAuthorized()),
                a == null ? null : a.getAuthorizedAt(), a == null ? null : a.getRevokedAt(), a == null ? null : a.getLastDataPull());
    }

    private Provider readableProvider(Long providerId) {
        authContext.requireProviderAccess(providerId);
        return support.provider(providerId, authContext.orgId());
    }

    private Provider writableProvider(Long providerId) {
        AuthPrincipal p = authContext.principal();
        if (!p.isProvider()) authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK);
        return readableProvider(providerId);
    }
}
