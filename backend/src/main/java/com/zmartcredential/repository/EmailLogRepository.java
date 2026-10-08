package com.zmartcredential.repository;

import com.zmartcredential.entity.EmailLog;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    Optional<EmailLog> findByIdAndOrgId(Long id, Long orgId);

    List<EmailLog> findByOrgId(Long orgId);

    List<EmailLog> findByOrgIdOrderByCreatedAtDesc(Long orgId);

    List<EmailLog> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    // --- operations module (email reminders) ---
    org.springframework.data.domain.Page<EmailLog> findByOrgIdOrderByCreatedAtDesc(
            Long orgId, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<EmailLog> findByOrgIdAndProviderIdOrderByCreatedAtDesc(
            Long orgId, Long providerId, org.springframework.data.domain.Pageable pageable);

    /** [providerId, max(createdAt)] per provider of the org. */
    @org.springframework.data.jpa.repository.Query("select e.providerId, max(e.createdAt) from EmailLog e "
            + "where e.orgId = :orgId and e.providerId is not null group by e.providerId")
    List<Object[]> findLastSentPerProvider(@org.springframework.data.repository.query.Param("orgId") Long orgId);
}
