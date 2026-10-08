package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "caqh_payer_authorization")
@Getter
@Setter
@NoArgsConstructor
public class CaqhPayerAuthorization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long payerId;

    private Boolean authorized = false;

    private LocalDateTime authorizedAt;

    private LocalDateTime revokedAt;

    private LocalDateTime lastDataPull;

    private Long updatedBy;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
