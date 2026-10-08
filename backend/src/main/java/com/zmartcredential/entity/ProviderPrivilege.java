package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "provider_privilege")
@Getter
@Setter
@NoArgsConstructor
public class ProviderPrivilege {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long hospitalId;

    private Long privilegeItemId;

    private String status = "requested";

    private LocalDate requestedAt;

    private LocalDate decidedAt;

    private Long updatedBy;
}
