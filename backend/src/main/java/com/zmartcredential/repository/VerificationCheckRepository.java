package com.zmartcredential.repository;

import com.zmartcredential.entity.VerificationCheck;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationCheckRepository extends JpaRepository<VerificationCheck, Long> {

    Optional<VerificationCheck> findByIdAndOrgId(Long id, Long orgId);

    List<VerificationCheck> findByOrgId(Long orgId);

    List<VerificationCheck> findByProviderIdOrderByCheckedAtDesc(Long providerId);
}
