package com.zmartcredential.repository;

import com.zmartcredential.entity.ExpirationAlertConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpirationAlertConfigRepository extends JpaRepository<ExpirationAlertConfig, Long> {
}
