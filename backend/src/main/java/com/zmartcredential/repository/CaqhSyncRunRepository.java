package com.zmartcredential.repository;

import com.zmartcredential.entity.CaqhSyncRun;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaqhSyncRunRepository extends JpaRepository<CaqhSyncRun, Long> {

    Optional<CaqhSyncRun> findByIdAndOrgId(Long id, Long orgId);

    List<CaqhSyncRun> findByOrgId(Long orgId);

    List<CaqhSyncRun> findByOrgIdOrderByStartedAtDesc(Long orgId);
}
