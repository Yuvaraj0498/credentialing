package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "attestation_reminder_rule")
@Getter
@Setter
@NoArgsConstructor
public class AttestationReminderRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String name;

    private Integer daysBefore;

    private String channel;

    private String template;

    private Boolean enabled = true;

    private LocalDateTime lastTriggeredAt;

    private Integer sentCount = 0;
}
