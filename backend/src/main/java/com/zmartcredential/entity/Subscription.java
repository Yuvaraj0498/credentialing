package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "subscription")
@Getter
@Setter
@NoArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String packageCode;

    private Integer providerCount = 0;

    private String status = "active";

    private LocalDateTime startedAt;

    private LocalDate nextRenewalDate;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
