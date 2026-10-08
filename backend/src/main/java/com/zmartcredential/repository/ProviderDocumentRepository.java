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

    /** Marks approved / pending documents whose expiration date has passed as expired. */
    @Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update ProviderDocument d set d.status = 'expired' where d.expiresAt < :today and d.status in ('approved', 'pending_review')")
    int expirePastDue(@org.springframework.data.repository.query.Param("today") java.time.LocalDate today);
}
