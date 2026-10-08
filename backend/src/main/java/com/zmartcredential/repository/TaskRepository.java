package com.zmartcredential.repository;

import com.zmartcredential.entity.Task;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {

    Optional<Task> findByIdAndOrgId(Long id, Long orgId);

    List<Task> findByOrgId(Long orgId);

    List<Task> findByOrgIdOrderByCreatedAtDesc(Long orgId);

    long countByOrgIdAndStatus(Long orgId, String status);

    // organization module (test data)
    long countByOrgIdAndTestDataTrue(Long orgId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from Task x where x.orgId = :orgId and x.testData = true")
    int orgDeleteTestData(@org.springframework.data.repository.query.Param("orgId") Long orgId);
}
