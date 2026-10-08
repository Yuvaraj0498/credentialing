package com.zmartcredential.repository;

import com.zmartcredential.entity.Organization;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findFirstByOrderByIdAsc();

    Optional<Organization> findByInviteCode(String code);

    boolean existsByInviteCode(String code);
}
