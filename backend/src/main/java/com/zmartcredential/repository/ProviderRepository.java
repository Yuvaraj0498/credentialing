package com.zmartcredential.repository;

import com.zmartcredential.entity.Provider;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProviderRepository extends JpaRepository<Provider, Long>, JpaSpecificationExecutor<Provider> {

    Optional<Provider> findByIdAndOrgId(Long id, Long orgId);

    List<Provider> findByOrgId(Long orgId);

    List<Provider> findByOrgIdOrderByLastNameAsc(Long orgId);

    boolean existsByOrgIdAndNpi(Long orgId, String npi);

    Optional<Provider> findByOrgIdAndNpi(Long orgId, String npi);

    long countByOrgIdAndLocationId(Long orgId, Long locationId);

    long countByOrgIdAndPracticeId(Long orgId, Long practiceId);

    List<Provider> findByOrgIdAndLocationId(Long orgId, Long locationId);

    // organization module
    @org.springframework.data.jpa.repository.Query("select p.locationId, count(p) from Provider p where p.orgId = :orgId and p.locationId is not null group by p.locationId")
    List<Object[]> orgCountByLocation(@org.springframework.data.repository.query.Param("orgId") Long orgId);

    @org.springframework.data.jpa.repository.Query("select p.practiceId, count(p) from Provider p where p.orgId = :orgId and p.practiceId is not null group by p.practiceId")
    List<Object[]> orgCountByPractice(@org.springframework.data.repository.query.Param("orgId") Long orgId);

    @org.springframework.data.jpa.repository.Query("select p.clientId, count(p) from Provider p where p.orgId = :orgId and p.clientId is not null group by p.clientId")
    List<Object[]> orgCountByClient(@org.springframework.data.repository.query.Param("orgId") Long orgId);

    @org.springframework.data.jpa.repository.Query("select p.orgId, count(p) from Provider p where p.orgId is not null group by p.orgId")
    List<Object[]> countGroupedByOrg();

    long countByOrgId(Long orgId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("update Provider p set p.locationId = null where p.orgId = :orgId and p.locationId = :locationId")
    int orgUnassignLocation(@org.springframework.data.repository.query.Param("orgId") Long orgId, @org.springframework.data.repository.query.Param("locationId") Long locationId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("update Provider p set p.practiceId = null where p.orgId = :orgId and p.practiceId = :practiceId")
    int orgUnassignPractice(@org.springframework.data.repository.query.Param("orgId") Long orgId, @org.springframework.data.repository.query.Param("practiceId") Long practiceId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("update Provider p set p.clientId = null, p.practiceId = null where p.orgId = :orgId and (p.clientId = :clientId or p.practiceId in (select pr.id from Practice pr where pr.clientId = :clientId))")
    int orgUnassignClient(@org.springframework.data.repository.query.Param("orgId") Long orgId, @org.springframework.data.repository.query.Param("clientId") Long clientId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("update Provider p set p.clientId = :clientId where p.orgId = :orgId and p.practiceId = :practiceId")
    int orgMovePracticeProviders(@org.springframework.data.repository.query.Param("orgId") Long orgId, @org.springframework.data.repository.query.Param("practiceId") Long practiceId, @org.springframework.data.repository.query.Param("clientId") Long clientId);

    long countByOrgIdAndTestDataTrue(Long orgId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from Provider p where p.orgId = :orgId and p.testData = true")
    int orgDeleteTestData(@org.springframework.data.repository.query.Param("orgId") Long orgId);

    java.util.List<Provider> findAllByEmailIgnoreCase(String email);
}
