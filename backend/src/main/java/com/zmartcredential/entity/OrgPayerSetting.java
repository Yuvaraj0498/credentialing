package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

/** A payer switched on / off for one organization by the super admin (no row = enabled). */
@Entity
@Table(name = "org_payer_setting")
@Getter
@Setter
@NoArgsConstructor
public class OrgPayerSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long payerId;

    private Boolean enabled = true;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
