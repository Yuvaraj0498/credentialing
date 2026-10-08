package com.zmartcredential.repository;

import com.zmartcredential.entity.RolePermission;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    Optional<RolePermission> findByIdAndOrgId(Long id, Long orgId);

    List<RolePermission> findByOrgId(Long orgId);

    List<RolePermission> findByOrgIdIsNull();

    // organization module
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from RolePermission r where r.orgId = :orgId")
    int deleteOrgOverrides(@org.springframework.data.repository.query.Param("orgId") Long orgId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from RolePermission r where r.role = :role")
    int deleteByRole(@org.springframework.data.repository.query.Param("role") String role);
}
