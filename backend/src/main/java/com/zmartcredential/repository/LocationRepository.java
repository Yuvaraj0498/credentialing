package com.zmartcredential.repository;

import com.zmartcredential.entity.Location;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, Long> {

    Optional<Location> findByIdAndOrgId(Long id, Long orgId);

    List<Location> findByOrgId(Long orgId);

    List<Location> findByOrgIdOrderByNameAsc(Long orgId);

    List<Location> findByPracticeId(Long practiceId);

    // organization module (test data)
    long countByOrgIdAndTestDataTrue(Long orgId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from Location x where x.orgId = :orgId and x.testData = true")
    int orgDeleteTestData(@org.springframework.data.repository.query.Param("orgId") Long orgId);
}
