package com.zmartcredential.repository;

import com.zmartcredential.entity.TimeEntry;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, Long> {

    Optional<TimeEntry> findByIdAndOrgId(Long id, Long orgId);

    List<TimeEntry> findByOrgId(Long orgId);

    List<TimeEntry> findByOrgIdAndProviderIdOrderByStartedAtDesc(Long orgId, Long providerId);
}
