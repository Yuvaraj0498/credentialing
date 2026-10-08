package com.zmartcredential.repository;

import com.zmartcredential.entity.ProviderInvite;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProviderInviteRepository extends JpaRepository<ProviderInvite, Long> {

    Optional<ProviderInvite> findByIdAndOrgId(Long id, Long orgId);

    List<ProviderInvite> findByOrgId(Long orgId);

    Optional<ProviderInvite> findByToken(String token);

    // providers module
    List<ProviderInvite> findByProviderIdAndStatusIn(Long providerId, java.util.Collection<String> statuses);
}
