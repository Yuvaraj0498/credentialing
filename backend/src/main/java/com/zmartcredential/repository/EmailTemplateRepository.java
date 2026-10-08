package com.zmartcredential.repository;

import com.zmartcredential.entity.EmailTemplate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {

    Optional<EmailTemplate> findByIdAndOrgId(Long id, Long orgId);

    List<EmailTemplate> findByOrgId(Long orgId);

    List<EmailTemplate> findByOrgIdIsNullOrOrgId(Long orgId);
}
