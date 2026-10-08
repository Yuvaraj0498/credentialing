package com.zmartcredential.repository;

import com.zmartcredential.entity.ProviderDocument;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface ProviderDocumentRepository extends JpaRepository<ProviderDocument, Long> {

    Optional<ProviderDocument> findByIdAndOrgId(Long id, Long orgId);

    List<ProviderDocument> findByProviderIdIn(java.util.Collection<Long> providerIds);

    List<ProviderDocument> findByOrgId(Long orgId);

    List<ProviderDocument> findByProviderId(Long providerId);

    Optional<ProviderDocument> findByProviderIdAndDocType(Long providerId, String docType);

    // enrollments module
    long countByProviderIdAndStatus(Long providerId, String status);

    @Transactional
    void deleteByProviderId(Long providerId);
}
