package com.zmartcredential.repository;

import com.zmartcredential.entity.OrgPayerSetting;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrgPayerSettingRepository extends JpaRepository<OrgPayerSetting, Long> {

    List<OrgPayerSetting> findByOrgId(Long orgId);

    Optional<OrgPayerSetting> findByOrgIdAndPayerId(Long orgId, Long payerId);
}
