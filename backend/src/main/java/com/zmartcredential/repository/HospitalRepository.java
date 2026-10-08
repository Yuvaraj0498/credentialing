package com.zmartcredential.repository;

import com.zmartcredential.entity.Hospital;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    Optional<Hospital> findByIdAndOrgId(Long id, Long orgId);

    List<Hospital> findByOrgId(Long orgId);

    List<Hospital> findByOrgIdOrderByNameAsc(Long orgId);
}
