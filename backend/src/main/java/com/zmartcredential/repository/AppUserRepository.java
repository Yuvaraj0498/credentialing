package com.zmartcredential.repository;

import com.zmartcredential.entity.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByIdAndOrgId(Long id, Long orgId);

    List<AppUser> findByOrgId(Long orgId);

    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByUsernameOrEmail(String username, String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    long countByUserRoleId(Long userRoleId);

    List<AppUser> findByOrgIdOrderByDisplayNameAsc(Long orgId);

    Optional<AppUser> findByProviderId(Long providerId);

    // organization module
    List<AppUser> findByRoleOrderByDisplayNameAsc(String role);

    boolean existsByEmailAndIdNot(String email, Long id);

    @org.springframework.data.jpa.repository.Query("select u.orgId, count(u) from AppUser u where u.orgId is not null group by u.orgId")
    List<Object[]> countGroupedByOrg();

    long countByOrgIdAndTestDataTrue(Long orgId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from AppUser u where u.orgId = :orgId and u.testData = true and u.id <> :keepUserId")
    int orgDeleteTestData(@org.springframework.data.repository.query.Param("orgId") Long orgId, @org.springframework.data.repository.query.Param("keepUserId") Long keepUserId);
}
