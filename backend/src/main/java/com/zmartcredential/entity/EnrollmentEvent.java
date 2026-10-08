package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "enrollment_event")
@Getter
@Setter
@NoArgsConstructor
public class EnrollmentEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long enrollmentId;

    private String eventType;

    private LocalDateTime occurredAt;

    private Long actorUserId;

    private String actorLabel;

    private String note;

    private String confirmationNumber;
}
