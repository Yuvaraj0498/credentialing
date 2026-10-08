package com.zmartcredential.repository;

import com.zmartcredential.entity.PayerRosterUpload;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayerRosterUploadRepository extends JpaRepository<PayerRosterUpload, Long> {

    Optional<PayerRosterUpload> findByIdAndOrgId(Long id, Long orgId);

    List<PayerRosterUpload> findByOrgId(Long orgId);

    Optional<PayerRosterUpload> findFirstByOrgIdAndPayerIdOrderByUploadedAtDesc(Long orgId, Long payerId);
}
