package com.zmartcredential.dto.organization;

import com.zmartcredential.entity.Organization;

import java.time.LocalDateTime;

/** Tenant organization details (invite code is exposed only via the dedicated endpoint). */
public record OrganizationResponse(
        Long id,
        String name,
        String orgType,
        String taxId,
        String website,
        String address,
        String city,
        String state,
        String zip,
        String phone,
        String email,
        String status,
        boolean selfSignup,
        LocalDateTime createdAt) {

    public static OrganizationResponse of(Organization o) {
        return new OrganizationResponse(o.getId(), o.getName(), o.getOrgType(), o.getTaxId(), o.getWebsite(),
                o.getAddress(), o.getCity(), o.getState(), o.getZip(), o.getPhone(), o.getEmail(), o.getStatus(),
                Boolean.TRUE.equals(o.getSelfSignup()), o.getCreatedAt());
    }
}
