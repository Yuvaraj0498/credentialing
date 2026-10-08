package com.zmartcredential.service;

import com.zmartcredential.dto.enrollment.CredentialVaultResponse;
import com.zmartcredential.entity.CredentialVault;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.CredentialVaultRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Zero-knowledge credential vault: the browser encrypts the whole vault (PBKDF2-SHA256 250k + AES-GCM)
 * and the server only stores the opaque ciphertext, one blob per organization.
 */
@Service
@RequiredArgsConstructor
public class CredentialVaultService {

    private final CredentialVaultRepository repository;
    private final EnrollmentSupport support;
    private final AuthContext authContext;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public CredentialVaultResponse get() {
        permissionService.require("credential_vault", "read");
        authContext.requireStaff();
        return repository.findById(authContext.orgId())
                .map(v -> new CredentialVaultResponse(true, v.getCiphertext(), v.getUpdatedAt(), v.getUpdatedBy()))
                .orElse(new CredentialVaultResponse(false, null, null, null));
    }

    @Transactional
    public CredentialVaultResponse save(String ciphertext) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        CredentialVault v = repository.findById(orgId).orElse(null);
        boolean creating = v == null;
        permissionService.require("credential_vault", creating ? "create" : "update");
        if (creating) {
            v = new CredentialVault();
            v.setOrgId(orgId);
        }
        v.setCiphertext(ciphertext);
        v.setUpdatedBy(authContext.userId());
        v = repository.saveAndFlush(v);
        support.audit(orgId, "credential_vault", orgId, creating ? "create" : "update",
                creating ? "Created encrypted credential vault" : "Updated encrypted credential vault");
        return new CredentialVaultResponse(true, v.getCiphertext(), v.getUpdatedAt(), v.getUpdatedBy());
    }

    @Transactional
    public void delete() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        Long orgId = authContext.orgId();
        CredentialVault v = repository.findById(orgId).orElseThrow(() -> new NotFoundException("No vault exists yet"));
        repository.delete(v);
        support.audit(orgId, "credential_vault", orgId, "delete", "Reset (deleted) encrypted credential vault");
    }
}
