package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "follow_up")
@Getter
@Setter
@NoArgsConstructor
public class FollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long userId;

    private String type;

    private String subject;

    private String outcome;

    private LocalDateTime occurredAt;

    private LocalDate nextDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
