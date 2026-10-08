package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "reminder_schedule")
@Getter
@Setter
@NoArgsConstructor
public class ReminderSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String reminderType;

    private Long templateId;

    private String cadence;

    private Boolean active = true;

    private LocalDateTime nextRunAt;

    private LocalDateTime lastSentAt;

    private Long createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
