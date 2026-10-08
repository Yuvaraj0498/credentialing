package com.zmartcredential.repository;

import com.zmartcredential.entity.AttestationReminderRule;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttestationReminderRuleRepository extends JpaRepository<AttestationReminderRule, Long> {

    Optional<AttestationReminderRule> findByIdAndOrgId(Long id, Long orgId);

    List<AttestationReminderRule> findByOrgId(Long orgId);

    List<AttestationReminderRule> findByOrgIdOrderByDaysBeforeDesc(Long orgId);
}
