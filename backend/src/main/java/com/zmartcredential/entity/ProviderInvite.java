package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "provider_invite")
@Getter
@Setter
@NoArgsConstructor
public class ProviderInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private String email;

    private String token;

    private String pin;

    private LocalDateTime expiresAt;

    private String status = "sent";

    private Integer attempts = 0;

    private Integer maxAttempts = 5;

    private LocalDateTime accessedAt;

    private LocalDateTime submittedAt;

    private Long createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
