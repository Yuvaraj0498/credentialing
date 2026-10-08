package com.zmartcredential.repository;

import com.zmartcredential.entity.PayerCredential;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayerCredentialRepository extends JpaRepository<PayerCredential, Long> {

    Optional<PayerCredential> findByIdAndOrgId(Long id, Long orgId);

    List<PayerCredential> findByOrgId(Long orgId);

    Optional<PayerCredential> findByOrgIdAndProviderIdAndPayerId(Long orgId, Long providerId, Long payerId);

    Optional<PayerCredential> findByOrgIdAndProviderIdIsNullAndPayerId(Long orgId, Long payerId);

    List<PayerCredential> findByOrgIdAndProviderIdIsNull(Long orgId);

    List<PayerCredential> findByOrgIdAndProviderId(Long orgId, Long providerId);
}
