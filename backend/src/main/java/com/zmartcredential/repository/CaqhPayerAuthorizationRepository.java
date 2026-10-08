package com.zmartcredential.repository;

import com.zmartcredential.entity.CaqhPayerAuthorization;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaqhPayerAuthorizationRepository extends JpaRepository<CaqhPayerAuthorization, Long> {

    Optional<CaqhPayerAuthorization> findByIdAndOrgId(Long id, Long orgId);

    List<CaqhPayerAuthorization> findByOrgId(Long orgId);

    List<CaqhPayerAuthorization> findByProviderId(Long providerId);

    Optional<CaqhPayerAuthorization> findByProviderIdAndPayerId(Long providerId, Long payerId);

    // enrollments module
    List<CaqhPayerAuthorization> findByProviderIdIn(java.util.Collection<Long> providerIds);
}
