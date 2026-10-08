package com.zmartcredential.repository;

import com.zmartcredential.entity.AttestationReminderLog;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttestationReminderLogRepository extends JpaRepository<AttestationReminderLog, Long> {

    Optional<AttestationReminderLog> findByIdAndOrgId(Long id, Long orgId);

    List<AttestationReminderLog> findByOrgId(Long orgId);

    List<AttestationReminderLog> findTop50ByOrgIdOrderBySentAtDesc(Long orgId);

    boolean existsByRuleIdAndProviderIdAndDueDate(Long ruleId, Long providerId, java.time.LocalDate dueDate);
}
