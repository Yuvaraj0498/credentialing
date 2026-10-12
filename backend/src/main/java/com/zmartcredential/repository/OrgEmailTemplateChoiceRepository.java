package com.zmartcredential.repository;

import com.zmartcredential.entity.OrgEmailTemplateChoice;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrgEmailTemplateChoiceRepository extends JpaRepository<OrgEmailTemplateChoice, Long> {

    Optional<OrgEmailTemplateChoice> findByOrgIdAndType(Long orgId, String type);
}
