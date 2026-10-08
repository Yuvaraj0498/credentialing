package com.zmartcredential.repository;

import com.zmartcredential.entity.ProviderPrivilege;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProviderPrivilegeRepository extends JpaRepository<ProviderPrivilege, Long> {

    Optional<ProviderPrivilege> findByIdAndOrgId(Long id, Long orgId);

    List<ProviderPrivilege> findByOrgId(Long orgId);

    List<ProviderPrivilege> findByProviderIdAndHospitalId(Long providerId, Long hospitalId);
}
