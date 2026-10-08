package com.zmartcredential.repository;

import com.zmartcredential.entity.EnrollmentEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentEventRepository extends JpaRepository<EnrollmentEvent, Long> {

    List<EnrollmentEvent> findByEnrollmentIdOrderByOccurredAtAsc(Long enrollmentId);

    // enrollments module
    List<EnrollmentEvent> findByEnrollmentIdIn(java.util.Collection<Long> enrollmentIds);
}
