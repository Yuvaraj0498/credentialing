package com.zmartcredential.repository;

import com.zmartcredential.entity.Subscription;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findByIdAndOrgId(Long id, Long orgId);

    Optional<Subscription> findByOrgId(Long orgId);
}
