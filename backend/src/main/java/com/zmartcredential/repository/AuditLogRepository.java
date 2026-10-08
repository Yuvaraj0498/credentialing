package com.zmartcredential.repository;

import com.zmartcredential.entity.AuditLog;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Optional<AuditLog> findByIdAndOrgId(Long id, Long orgId);

    List<AuditLog> findByOrgId(Long orgId);
}
