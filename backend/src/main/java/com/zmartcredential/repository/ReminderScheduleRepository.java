package com.zmartcredential.repository;

import com.zmartcredential.entity.ReminderSchedule;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReminderScheduleRepository extends JpaRepository<ReminderSchedule, Long> {

    Optional<ReminderSchedule> findByIdAndOrgId(Long id, Long orgId);

    List<ReminderSchedule> findByOrgId(Long orgId);

    List<ReminderSchedule> findByOrgIdOrderByCreatedAtDesc(Long orgId);

    List<ReminderSchedule> findByActiveTrueAndNextRunAtLessThanEqual(java.time.LocalDateTime now);
}
