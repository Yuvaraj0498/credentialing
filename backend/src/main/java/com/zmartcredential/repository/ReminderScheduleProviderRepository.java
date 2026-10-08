package com.zmartcredential.repository;

import com.zmartcredential.entity.ReminderScheduleProvider;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface ReminderScheduleProviderRepository extends JpaRepository<ReminderScheduleProvider, ReminderScheduleProvider.Key> {

    List<ReminderScheduleProvider> findByScheduleId(Long scheduleId);

    @Transactional
    void deleteByScheduleId(Long scheduleId);

    List<ReminderScheduleProvider> findByScheduleIdIn(java.util.Collection<Long> scheduleIds);
}
