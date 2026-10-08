package com.zmartcredential.repository;

import com.zmartcredential.entity.ExpirationAlertDocType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface ExpirationAlertDocTypeRepository extends JpaRepository<ExpirationAlertDocType, ExpirationAlertDocType.Key> {

    List<ExpirationAlertDocType> findByOrgId(Long orgId);

    @Transactional
    void deleteByOrgId(Long orgId);
}
