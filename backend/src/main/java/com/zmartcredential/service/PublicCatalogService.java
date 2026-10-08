package com.zmartcredential.service;

import com.zmartcredential.dto.organization.PublicCatalogDtos.InviteCodeOrg;
import com.zmartcredential.dto.organization.PublicCatalogDtos.PublicPackage;
import com.zmartcredential.dto.organization.PublicCatalogDtos.PublicState;
import com.zmartcredential.entity.PackageFeature;
import com.zmartcredential.entity.SubscriptionPackage;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.PackageFeatureRepository;
import com.zmartcredential.repository.PricingStateRepository;
import com.zmartcredential.repository.SubscriptionPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/** Public (no auth) data for the sign-up flows. */
@Service
@RequiredArgsConstructor
public class PublicCatalogService {

    private final SubscriptionPackageRepository packageRepository;
    private final PackageFeatureRepository featureRepository;
    private final PricingStateRepository stateRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public List<PublicPackage> packages() {
        return packageRepository.findByActiveTrueOrderBySortOrderAsc().stream().map(this::toPackage).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicState> states() {
        return stateRepository.findAllByOrderByCodeAsc().stream()
                .map(s -> new PublicState(s.getCode(), s.getName())).toList();
    }

    @Transactional(readOnly = true)
    public InviteCodeOrg orgByInviteCode(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
        return organizationRepository.findByInviteCode(normalized)
                .filter(o -> !"suspended".equals(o.getStatus()))
                .map(o -> new InviteCodeOrg(o.getName()))
                .orElseThrow(() -> new NotFoundException("No organization found for this code"));
    }

    private PublicPackage toPackage(SubscriptionPackage p) {
        List<PackageFeature> features = featureRepository.findByPackageCodeOrderBySortOrderAsc(p.getCode());
        return new PublicPackage(p.getCode(), p.getCode(), p.getName(), p.getBasePrice(), p.getPerProvider(),
                p.getColor(), p.getColorSoft(), Boolean.TRUE.equals(p.getRecommended()), p.getProviderCap(),
                p.getPayerCap(), p.getAiUploadsPerMonth(), p.getPrimarySupport(),
                p.getSortOrder() == null ? 0 : p.getSortOrder(),
                features.stream().filter(f -> Boolean.TRUE.equals(f.getIncluded())).map(PackageFeature::getLabel).toList(),
                features.stream().filter(f -> !Boolean.TRUE.equals(f.getIncluded())).map(PackageFeature::getLabel).toList());
    }
}
