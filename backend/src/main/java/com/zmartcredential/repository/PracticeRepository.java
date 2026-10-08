package com.zmartcredential.repository;

import com.zmartcredential.entity.Practice;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PracticeRepository extends JpaRepository<Practice, Long> {

    Optional<Practice> findByIdAndOrgId(Long id, Long orgId);

    List<Practice> findByOrgId(Long orgId);

    List<Practice> findByOrgIdOrderByNameAsc(Long orgId);

    List<Practice> findByClientId(Long clientId);

    long countByOrgIdAndTestDataTrue(Long orgId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from Practice x where x.orgId = :orgId and x.testData = true")
    int orgDeleteTestData(@org.springframework.data.repository.query.Param("orgId") Long orgId);
}
