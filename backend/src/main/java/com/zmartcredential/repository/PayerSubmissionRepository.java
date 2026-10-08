package com.zmartcredential.repository;

import com.zmartcredential.entity.PayerSubmission;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayerSubmissionRepository extends JpaRepository<PayerSubmission, Long> {

    Optional<PayerSubmission> findByIdAndOrgId(Long id, Long orgId);

    List<PayerSubmission> findByOrgId(Long orgId);

    List<PayerSubmission> findByOrgIdOrderBySubmittedAtDesc(Long orgId);

    // enrollments module
    boolean existsByPayerId(Long payerId);
}
