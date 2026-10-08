package com.zmartcredential.repository;

import com.zmartcredential.entity.PaymentMethod;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, Long> {

    Optional<PaymentMethod> findByIdAndOrgId(Long id, Long orgId);

    List<PaymentMethod> findByOrgId(Long orgId);

    List<PaymentMethod> findByOrgIdOrderByCreatedAtAsc(Long orgId);
}
