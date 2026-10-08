package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "attestation_reminder_log")
@Getter
@Setter
@NoArgsConstructor
public class AttestationReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long ruleId;

    private Long providerId;

    private String channel;

    private String template;

    private LocalDate dueDate;

    private String status = "queued";

    private String triggeredBy = "manual";

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime sentAt;
}
