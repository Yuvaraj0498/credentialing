package com.zmartcredential.repository;

import com.zmartcredential.entity.EnrollmentFile;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentFileRepository extends JpaRepository<EnrollmentFile, Long> {

    List<EnrollmentFile> findByEnrollmentIdOrderByUploadedAtDesc(Long enrollmentId);

    // enrollments module
    List<EnrollmentFile> findByEnrollmentIdIn(java.util.Collection<Long> enrollmentIds);
}
