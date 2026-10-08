package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "payer_credential")
@Getter
@Setter
@NoArgsConstructor
public class PayerCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long payerId;

    /**
     * Organization logins only (providerId null): the providers this login is used for. Eager because it is small and is
     * read outside transactions (portal sign-in).
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "payer_credential_provider", joinColumns = @JoinColumn(name = "credential_id"))
    @Column(name = "provider_id")
    private Set<Long> assignedProviderIds = new HashSet<>();

    /** Whether this login may be used for the provider: their own login, or an organization login assigned to them. */
    public boolean appliesTo(Long provider) {
        return providerId != null ? providerId.equals(provider) : assignedProviderIds.contains(provider);
    }

    private String username;

    private String passwordEnc;

    private String portalUrl;

    private String payerProviderId;

    private String groupTin;

    private String notes;

    private LocalDateTime lastTestAt;

    private Boolean lastTestOk;

    private Long updatedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
