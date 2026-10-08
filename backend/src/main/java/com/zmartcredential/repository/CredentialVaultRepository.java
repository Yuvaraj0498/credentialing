package com.zmartcredential.repository;

import com.zmartcredential.entity.CredentialVault;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CredentialVaultRepository extends JpaRepository<CredentialVault, Long> {
}
