package com.zmartcredential.repository;

import com.zmartcredential.entity.Client;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Long> {

    Optional<Client> findByIdAndOrgId(Long id, Long orgId);

    List<Client> findByOrgId(Long orgId);

    List<Client> findByOrgIdOrderByNameAsc(Long orgId);

    long countByOrgIdAndTestDataTrue(Long orgId);

    /** Practices of these clients cascade (FK ON DELETE CASCADE). */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from Client x where x.orgId = :orgId and x.testData = true")
    int orgDeleteTestData(@org.springframework.data.repository.query.Param("orgId") Long orgId);
}
