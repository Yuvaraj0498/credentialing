package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "caqh_sync_run")
@Getter
@Setter
@NoArgsConstructor
public class CaqhSyncRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String triggerType;

    private String status;

    private Integer providersChecked = 0;

    private Integer providersUpdated = 0;

    private String changes;

    private Integer durationSec = 0;

    private LocalDateTime startedAt;
}
