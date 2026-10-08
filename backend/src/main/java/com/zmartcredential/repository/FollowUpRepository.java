package com.zmartcredential.repository;

import com.zmartcredential.entity.FollowUp;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowUpRepository extends JpaRepository<FollowUp, Long> {

    Optional<FollowUp> findByIdAndOrgId(Long id, Long orgId);

    List<FollowUp> findByOrgId(Long orgId);

    List<FollowUp> findByOrgIdAndProviderIdOrderByOccurredAtDesc(Long orgId, Long providerId);
}
